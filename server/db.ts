import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, userAppState, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    // הגדרת 14 ימי ניסיון בחינם למשתמש חדש
    if (!values.trialEndsAt) {
      const trialDays = 14;
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + trialDays);
      values.trialEndsAt = trialEnd;
      values.subscriptionStatus = "trialing";
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Every account for the owner's admin dashboard: who registered, their
 * trial/subscription state, and when they were last seen. Reads only
 * existing columns (no login/logout event log exists), ordered by most
 * recent activity so the newest sign-ins surface first.
 */
export async function listUsersForAdmin() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: users.id,
      openId: users.openId,
      email: users.email,
      name: users.name,
      role: users.role,
      subscriptionStatus: users.subscriptionStatus,
      trialEndsAt: users.trialEndsAt,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      loginMethod: users.loginMethod,
    })
    .from(users)
    .orderBy(desc(users.lastSignedIn));
}

export const SUPABASE_OPEN_ID_PREFIX = "supabase:";

/**
 * Bridges a verified Supabase identity into the app's own `users` table,
 * provisioning a row (with the standard trial defaults from `upsertUser`) on
 * first sight. This lets a user who signed up through the live Supabase
 * register screen use every endpoint gated by `protectedProcedure` /
 * `activeSubscriptionProcedure`, which only ever look at this table.
 */
export async function resolveUserFromSupabaseIdentity(identity: { id: string; email: string | null; name: string | null }) {
  const openId = `${SUPABASE_OPEN_ID_PREFIX}${identity.id}`;
  let user = await getUserByOpenId(openId);
  if (!user) {
    await upsertUser({
      openId,
      email: identity.email,
      name: identity.name,
      loginMethod: "supabase",
      lastSignedIn: new Date(),
    });
    user = await getUserByOpenId(openId);
  } else {
    await upsertUser({ openId, lastSignedIn: new Date() });
  }
  return user ?? undefined;
}

/**
 * Marks a user's subscription active for `extendByDays` from whichever is
 * later: now, or their current trial/subscription end. Only ever called after
 * a Morning webhook signature has been verified - never from a client-trusted
 * redirect - so a paid subscription always reflects a server-confirmed charge.
 */
export async function activateUserSubscription(userId: number, extendByDays: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await getUserById(userId);
  if (!user) throw new Error(`Cannot activate subscription: user ${userId} not found`);

  const now = Date.now();
  const currentEnd = user.trialEndsAt ? new Date(user.trialEndsAt).getTime() : now;
  const base = Number.isFinite(currentEnd) ? Math.max(currentEnd, now) : now;
  const newEnd = new Date(base + extendByDays * 24 * 60 * 60 * 1000);

  await db
    .update(users)
    .set({ subscriptionStatus: "active", trialEndsAt: newEnd })
    .where(eq(users.id, userId));
}

export async function getUserAppState(userId: number): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ payload: userAppState.payload }).from(userAppState).where(eq(userAppState.userId, userId)).limit(1);
  return result[0]?.payload ?? null;
}

export async function saveUserAppState(userId: number, payload: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userAppState).values({ userId, payload }).onDuplicateKeyUpdate({ set: { payload, updatedAt: new Date() } });
}