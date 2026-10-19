import { CHAT_LIMITS } from "@vakil/domain";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ownCase, fail } from "./lib/access";
import { boundedText } from "./lib/input";
import { documentType, validateDocument } from "./lib/chat";

export const authorizeUpload = internalQuery({ args: { caseId: v.id("cases") }, handler: async (ctx, args) => {
  await ownCase(ctx, args.caseId);
  const documents = await ctx.db.query("caseDocuments").withIndex("by_case", q => q.eq("caseId", args.caseId)).take(CHAT_LIMITS.documentsPerCase);
  if (documents.length >= CHAT_LIMITS.documentsPerCase) fail("LIMIT_EXCEEDED", "Remove a document before uploading another.");
  return null;
} });
export const attach = internalMutation({ args: { caseId: v.id("cases"), storageId: v.id("_storage"), contentType: documentType, fileName: v.string() }, handler: async (ctx, args) => {
  await ownCase(ctx, args.caseId);
  const documents = await ctx.db.query("caseDocuments").withIndex("by_case", q => q.eq("caseId", args.caseId)).take(CHAT_LIMITS.documentsPerCase);
  if (documents.length >= CHAT_LIMITS.documentsPerCase) fail("LIMIT_EXCEEDED", "Document limit reached.");
  const metadata = await ctx.db.system.get(args.storageId);
  if (!metadata || metadata.size < 1 || metadata.size > CHAT_LIMITS.documentBytes || (metadata.contentType !== undefined && metadata.contentType !== args.contentType)) fail("INVALID_INPUT", "Stored document metadata mismatch.");
  return await ctx.db.insert("caseDocuments", { ...args, size: metadata.size });
} });
// Default Convex runtime accepts binary uploads without Node's 5 MiB argument ceiling.
export const upload = action({ args: { caseId: v.id("cases"), content: v.bytes(), contentType: v.string(), fileName: v.string() }, handler: async (ctx, args): Promise<Id<"caseDocuments">> => {
  await ctx.runQuery(internal.caseDocuments.authorizeUpload, { caseId: args.caseId });
  const fileName = boundedText(args.fileName, "File name", 150);
  if (/[\x00-\x1f/\\]/u.test(fileName)) fail("INVALID_INPUT", "Unsupported file name.");
  const contentType = args.contentType;
  if (contentType !== "application/pdf" && contentType !== "image/png" && contentType !== "image/jpeg" && contentType !== "text/plain") fail("INVALID_INPUT", "Unsupported document type.");
  validateDocument(args.content, contentType);
  const storageId = await ctx.storage.store(new Blob([args.content], { type: contentType }));
  try { return await ctx.runMutation(internal.caseDocuments.attach, { caseId: args.caseId, storageId, contentType, fileName }); }
  catch (error) { await ctx.storage.delete(storageId); throw error; }
} });
export const listMine = query({ args: { caseId: v.id("cases") }, handler: async (ctx, args) => {
  await ownCase(ctx, args.caseId);
  return (await ctx.db.query("caseDocuments").withIndex("by_case", q => q.eq("caseId", args.caseId)).take(CHAT_LIMITS.documentsPerCase)).map(({ _id, fileName, contentType, size }) => ({ _id, fileName, contentType, size }));
} });
export const authorizeRead = internalQuery({ args: { documentId: v.id("caseDocuments") }, handler: async (ctx, args) => {
  const document = await ctx.db.get(args.documentId);
  if (!document) fail("NOT_FOUND", "Document not found.");
  await ownCase(ctx, document.caseId);
  return document;
} });
export const read = action({ args: { documentId: v.id("caseDocuments") }, handler: async (ctx, args): Promise<{ content: ArrayBuffer; contentType: string; fileName: string }> => {
  const document = await ctx.runQuery(internal.caseDocuments.authorizeRead, args);
  const blob = await ctx.storage.get(document.storageId);
  if (!blob) fail("NOT_FOUND", "Document content unavailable.");
  const content = await blob.arrayBuffer();
  await ctx.runQuery(internal.caseDocuments.authorizeRead, args);
  return { content, contentType: document.contentType, fileName: document.fileName };
} });
export const remove = mutation({ args: { documentId: v.id("caseDocuments") }, handler: async (ctx, args) => {
  const document = await ctx.db.get(args.documentId);
  if (!document) fail("NOT_FOUND", "Document not found.");
  await ownCase(ctx, document.caseId);
  const turns = await ctx.db.query("chatTurns").withIndex("by_case", q => q.eq("caseId", document.caseId)).take(CHAT_LIMITS.turns);
  if (turns.some(turn => turn.result.kind === "pending" && turn.expiresAt > Date.now() && turn.documentIds.includes(document._id))) fail("CONFLICT", "Document is in use by an active send.");
  await ctx.storage.delete(document.storageId);
  await ctx.db.delete(document._id);
  return null;
} });
