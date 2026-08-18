import {
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const garminConnections = mysqlTable("garmin_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: varchar("provider", { length: 32 }).default("garmin").notNull(),
  garminUserIdHash: varchar("garminUserIdHash", { length: 64 }).unique(),
  status: mysqlEnum("status", ["pending", "active", "expired", "revoked", "error"])
    .default("pending")
    .notNull(),
  scopes: json("scopes").$type<string[]>().notNull(),
  connectedAt: timestamp("connectedAt"),
  lastSyncAt: timestamp("lastSyncAt"),
  lastErrorCode: varchar("lastErrorCode", { length: 64 }),
  lastErrorAt: timestamp("lastErrorAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const garminCredentials = mysqlTable("garmin_credentials", {
  connectionId: int("connectionId").primaryKey(),
  accessTokenCiphertext: text("accessTokenCiphertext").notNull(),
  refreshTokenCiphertext: text("refreshTokenCiphertext"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  keyVersion: varchar("keyVersion", { length: 32 }).notNull(),
  tokenFingerprint: varchar("tokenFingerprint", { length: 64 }).notNull(),
  rotatedAt: timestamp("rotatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const garminOauthStates = mysqlTable("garmin_oauth_states", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stateHash: varchar("stateHash", { length: 64 }).unique().notNull(),
  codeVerifierCiphertext: text("codeVerifierCiphertext"),
  returnUri: varchar("returnUri", { length: 255 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const garminSyncRuns = mysqlTable("garmin_sync_runs", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull(),
  requestedBy: mysqlEnum("requestedBy", ["user", "scheduled", "retry"]).notNull(),
  status: mysqlEnum("status", ["queued", "running", "success", "partial", "failed"])
    .default("queued")
    .notNull(),
  windowStart: timestamp("windowStart"),
  windowEnd: timestamp("windowEnd"),
  recordsRead: int("recordsRead").default(0).notNull(),
  recordsWritten: int("recordsWritten").default(0).notNull(),
  cursor: varchar("cursor", { length: 255 }),
  errorCode: varchar("errorCode", { length: 64 }),
  startedAt: timestamp("startedAt"),
  finishedAt: timestamp("finishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const garminDailyHealth = mysqlTable("garmin_daily_health", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull(),
  sourceExternalId: varchar("sourceExternalId", { length: 191 }).notNull(),
  metricDate: timestamp("metricDate").notNull(),
  sleepSeconds: int("sleepSeconds"),
  restingHeartRate: int("restingHeartRate"),
  stressScore: int("stressScore"),
  bodyBattery: int("bodyBattery"),
  steps: int("steps"),
  calories: int("calories"),
  respiration: int("respiration"),
  sourceUpdatedAt: timestamp("sourceUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const garminActivities = mysqlTable("garmin_activities", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull(),
  sourceActivityId: varchar("sourceActivityId", { length: 191 }).notNull(),
  activityType: varchar("activityType", { length: 64 }),
  startedAt: timestamp("startedAt"),
  durationSeconds: int("durationSeconds"),
  distanceMeters: int("distanceMeters"),
  calories: int("calories"),
  averageHeartRate: int("averageHeartRate"),
  maxHeartRate: int("maxHeartRate"),
  trainingLoad: int("trainingLoad"),
  sourceUpdatedAt: timestamp("sourceUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const garminAuditEvents = mysqlTable("garmin_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  connectionId: int("connectionId"),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  requestId: varchar("requestId", { length: 64 }),
  metadataJson: json("metadataJson").$type<Record<string, string | number | boolean | null>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type GarminConnection = typeof garminConnections.$inferSelect;
export type GarminCredential = typeof garminCredentials.$inferSelect;
export type GarminSyncRun = typeof garminSyncRuns.$inferSelect;
