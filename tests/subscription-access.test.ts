import { describe, expect, it } from "vitest";
import { computeSubscriptionAccess } from "../server/_core/subscriptionAccess";
import type { User } from "../drizzle/schema";

function makeUser(overrides: Partial<User>): User {
  return {
    id: 1,
    openId: "user-1",
    name: "Test",
    email: "test@example.com",
    loginMethod: "supabase",
    role: "user",
    subscriptionStatus: "trialing",
    trialEndsAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

describe("computeSubscriptionAccess", () => {
  it("grants access during a still-valid trial", () => {
    const trialEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const access = computeSubscriptionAccess(makeUser({ trialEndsAt }));
    expect(access.isTrialValid).toBe(true);
    expect(access.hasAccess).toBe(true);
  });

  it("locks the account the instant the trial end timestamp is in the past", () => {
    const trialEndsAt = new Date(Date.now() - 1000);
    const access = computeSubscriptionAccess(makeUser({ trialEndsAt, subscriptionStatus: "expired" }));
    expect(access.isTrialValid).toBe(false);
    expect(access.hasAccess).toBe(false);
  });

  it("locks an account with no trialEndsAt and no paid subscription", () => {
    const access = computeSubscriptionAccess(makeUser({ trialEndsAt: null, subscriptionStatus: "trialing" }));
    expect(access.hasAccess).toBe(false);
  });

  it("grants access for an active paid subscription even after the trial ended", () => {
    const trialEndsAt = new Date(Date.now() - 1000);
    const access = computeSubscriptionAccess(makeUser({ trialEndsAt, subscriptionStatus: "active" }));
    expect(access.isPaidActive).toBe(true);
    expect(access.hasAccess).toBe(true);
  });

  it("never locks out an admin, regardless of trial or subscription state", () => {
    const trialEndsAt = new Date(Date.now() - 1000);
    const access = computeSubscriptionAccess(makeUser({ trialEndsAt, subscriptionStatus: "expired", role: "admin" }));
    expect(access.isAdmin).toBe(true);
    expect(access.hasAccess).toBe(true);
  });
});
