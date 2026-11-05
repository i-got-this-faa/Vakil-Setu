import { convexTest } from "convex-test";
import { expect, it } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");
it("compares at most three distinct approved active profiles using public fields only", async () => {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const reviewerId = await ctx.db.insert("accounts", { clerkSubject: "comparison-admin", role: "admin", displayName: "Synthetic admin", locale: "en", disabled: false });
    return await Promise.all([0, 1, 2, 3].map(async index => {
      const accountId = await ctx.db.insert("accounts", { clerkSubject: `comparison-${index}`, role: "advocate", displayName: `Synthetic advocate ${index}`, locale: "en", disabled: index === 3 });
      const advocateId = await ctx.db.insert("advocates", { accountId, displayName: `Synthetic advocate ${index}`, city: "Test city", cityKey: "test city", bio: "Synthetic public bio", barRegistration: "PRIVATE-CREDENTIAL-MARKER", yearsExperience: 5, domains: ["civil"], locales: ["en"], consultationModes: ["video"], revision: 1, application: index === 2 ? { kind: "pending" } : { kind: "approved", reviewerId, reviewedAt: Date.now(), reason: "Synthetic test approval" } });
      return { advocateId, accountId };
    }));
  });
  const first = ids[0], pending = ids[2], disabled = ids[3];
  if (!first || !pending || !disabled) throw new Error("Missing comparison fixture");
  const result = await t.query(api.advocates.comparePublic, { advocateIds: [first.advocateId, pending.advocateId, disabled.advocateId] });
  expect(result[0]?.profile).toMatchObject({ displayName: "Synthetic advocate 0", rating: { average: null, count: 0 } });
  expect(JSON.stringify(result)).not.toContain("PRIVATE-CREDENTIAL-MARKER");
  expect(result[0]?.profile).not.toHaveProperty("accountId");
  expect(result[1]?.profile).toBeNull(); expect(result[2]?.profile).toBeNull();
  await expect(t.query(api.advocates.comparePublic, { advocateIds: ids.map(value => value.advocateId) })).rejects.toThrow();
  await expect(t.query(api.advocates.comparePublic, { advocateIds: [first.advocateId, first.advocateId] })).rejects.toThrow();
  await t.run(ctx => ctx.db.patch(first.accountId, { disabled: true }));
  expect((await t.query(api.advocates.comparePublic, { advocateIds: [first.advocateId] }))[0]?.profile).toBeNull();
  await t.run(ctx => ctx.db.delete(first.advocateId));
  expect((await t.query(api.advocates.comparePublic, { advocateIds: [first.advocateId] }))[0]?.profile).toBeNull();
});
