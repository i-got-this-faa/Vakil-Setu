import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail, requireAccount } from "./lib/access";
import { page } from "./lib/input";

export const mine = query({ args: { paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const account = await requireAccount(ctx);
  return await ctx.db.query("notifications").withIndex("by_account", (q) => q.eq("accountId", account._id)).order("desc").paginate(page(args.paginationOpts));
} });
export const markRead = mutation({ args: { notificationId: v.id("notifications") }, handler: async (ctx, args) => {
  const account = await requireAccount(ctx);
  const notification = await ctx.db.get(args.notificationId);
  if (!notification || notification.accountId !== account._id) fail("NOT_FOUND", "Notification not found.");
  if (notification.readAt === undefined) await ctx.db.patch(notification._id, { readAt: Date.now() });
  return null;
} });
