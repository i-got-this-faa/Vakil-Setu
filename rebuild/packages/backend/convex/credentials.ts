import { LIMITS } from "@vakil/domain";
import { v } from "convex/values";
import type { Infer } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { credentialType } from "./lib/validators";
import { fail, ownAdvocate, requireAccount } from "./lib/access";
import { boundedText } from "./lib/input";
import { invalidateApproval } from "./lib/lifecycle";
import { notify } from "./lib/notifications";

export const authorizeUpload = internalQuery({ args: {}, handler: async (ctx) => {
  const { advocate } = await ownAdvocate(ctx);
  const existing = await ctx.db.query("credentials").withIndex("by_advocate", (q) => q.eq("advocateId", advocate._id)).take(LIMITS.credentialsPerAdvocate);
  if (existing.length >= LIMITS.credentialsPerAdvocate) fail("LIMIT_EXCEEDED", "Remove an existing credential before uploading another.");
  return null;
} });
export const attach = internalMutation({ args: { storageId: v.id("_storage"), contentType: credentialType, fileName: v.string() }, handler: async (ctx, args) => {
  const { advocate } = await ownAdvocate(ctx);
  const existing = await ctx.db.query("credentials").withIndex("by_advocate", (q) => q.eq("advocateId", advocate._id)).take(LIMITS.credentialsPerAdvocate);
  if (existing.length >= LIMITS.credentialsPerAdvocate) fail("LIMIT_EXCEEDED", "Credential limit reached.");
  const metadata = await ctx.db.system.get(args.storageId);
  // Convex storage metadata may omit MIME type; upload already validates the actual bytes.
  if (!metadata || metadata.size < 1 || metadata.size > LIMITS.credentialBytes || (metadata.contentType !== undefined && metadata.contentType !== args.contentType)) fail("INVALID_INPUT", "Stored credential metadata does not match validated content.");
  await invalidateApproval(ctx, advocate, "Credential set changed; application requires review again.");
  return await ctx.db.insert("credentials", { advocateId: advocate._id, storageId: args.storageId, contentType: args.contentType, fileName: boundedText(args.fileName, "File name", 150), size: metadata.size, review: { kind: "pending" } });
} });

export const upload = action({
  args: { content: v.bytes(), contentType: credentialType, fileName: v.string() },
  handler: async (ctx, args): Promise<Id<"credentials">> => {
    await ctx.runQuery(internal.credentials.authorizeUpload, {});
    const fileName = boundedText(args.fileName, "File name", 150);
    if (/[\x00-\x1f/\\]/u.test(fileName)) fail("INVALID_INPUT", "File name contains unsupported characters.");
    if (args.content.byteLength < 8 || args.content.byteLength > LIMITS.credentialBytes) fail("INVALID_INPUT", "Credential must be nonempty and at most 5 MiB.");
    const bytes = new Uint8Array(args.content);
    const pdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!(args.contentType === "application/pdf" ? pdf : args.contentType === "image/png" ? png : jpeg)) fail("INVALID_INPUT", "Credential bytes do not match the declared file type.");
    const storageId = await ctx.storage.store(new Blob([args.content], { type: args.contentType }));
    try { return await ctx.runMutation(internal.credentials.attach, { storageId, contentType: args.contentType, fileName }); }
    catch (error) { await ctx.storage.delete(storageId); throw error; }
  },
});
export const mine = query({ args: {}, handler: async (ctx) => {
  const { advocate } = await ownAdvocate(ctx);
  return (await ctx.db.query("credentials").withIndex("by_advocate", (q) => q.eq("advocateId", advocate._id)).collect()).map(({ storageId: _storageId, ...metadata }) => metadata);
} });
async function readableCredential(ctx: QueryCtx | MutationCtx, credentialId: Id<"credentials">) {
  const account = await requireAccount(ctx);
  const credential = await ctx.db.get(credentialId);
  const advocate = credential ? await ctx.db.get(credential.advocateId) : null;
  if (!credential || !advocate || (account.role !== "admin" && advocate.accountId !== account._id)) fail("NOT_FOUND", "Credential not found.");
  return { account, credential };
}
export const authorizeRead = internalQuery({ args: { credentialId: v.id("credentials") }, handler: async (ctx, args) => {
  return (await readableCredential(ctx, args.credentialId)).credential;
} });
export const auditRead = internalMutation({ args: { credentialId: v.id("credentials") }, handler: async (ctx, args) => {
  const { account, credential } = await readableCredential(ctx, args.credentialId);
  await ctx.db.insert("credentialReads", { credentialId: credential._id, readerId: account._id, role: account.role, at: Date.now() });
  return null;
} });
export const read = action({ args: { credentialId: v.id("credentials") }, handler: async (ctx, args): Promise<{ content: ArrayBuffer; contentType: Infer<typeof credentialType>; fileName: string }> => {
  const credential = await ctx.runQuery(internal.credentials.authorizeRead, args);
  const blob = await ctx.storage.get(credential.storageId);
  if (!blob) fail("NOT_FOUND", "Credential content is unavailable.");
  const content = await blob.arrayBuffer();
  // Audit and recheck permission after obtaining bytes; never return a bearer URL.
  await ctx.runMutation(internal.credentials.auditRead, args);
  return { content, contentType: credential.contentType, fileName: credential.fileName };
} });
export const review = mutation({ args: { credentialId: v.id("credentials"), decision: v.union(v.literal("valid"), v.literal("rejected")), reason: v.string() }, handler: async (ctx, args) => {
  const admin = await requireAccount(ctx, "admin");
  const credential = await ctx.db.get(args.credentialId);
  if (!credential) fail("NOT_FOUND", "Credential not found.");
  const advocate = await ctx.db.get(credential.advocateId);
  if (!advocate) fail("NOT_FOUND", "Application not found.");
  const reason = boundedText(args.reason, "Review reason", 1000);
  await ctx.db.patch(credential._id, { review: { kind: args.decision, reviewerId: admin._id, reviewedAt: Date.now(), reason } });
  if (args.decision === "rejected") await invalidateApproval(ctx, advocate, "Credential approval withdrawn.");
  await notify(ctx, advocate.accountId, "credential_reviewed", `Credential ${args.decision}.`);
  return null;
} });
export const remove = mutation({ args: { credentialId: v.id("credentials") }, handler: async (ctx, args) => {
  const { advocate } = await ownAdvocate(ctx);
  const credential = await ctx.db.get(args.credentialId);
  if (!credential || credential.advocateId !== advocate._id) fail("NOT_FOUND", "Credential not found.");
  await invalidateApproval(ctx, advocate, "Credential removed; application requires review again.");
  await ctx.storage.delete(credential.storageId);
  await ctx.db.delete(credential._id);
  return null;
} });
