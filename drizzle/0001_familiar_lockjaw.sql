CREATE TABLE `garmin_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` int NOT NULL,
	`sourceActivityId` varchar(191) NOT NULL,
	`activityType` varchar(64),
	`startedAt` timestamp,
	`durationSeconds` int,
	`distanceMeters` int,
	`calories` int,
	`averageHeartRate` int,
	`maxHeartRate` int,
	`trainingLoad` int,
	`sourceUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `garmin_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `garmin_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`connectionId` int,
	`eventType` varchar(64) NOT NULL,
	`requestId` varchar(64),
	`metadataJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `garmin_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `garmin_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(32) NOT NULL DEFAULT 'garmin',
	`garminUserIdHash` varchar(64),
	`status` enum('pending','active','expired','revoked','error') NOT NULL DEFAULT 'pending',
	`scopes` json NOT NULL,
	`connectedAt` timestamp,
	`lastSyncAt` timestamp,
	`lastErrorCode` varchar(64),
	`lastErrorAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `garmin_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `garmin_connections_garminUserIdHash_unique` UNIQUE(`garminUserIdHash`)
);
--> statement-breakpoint
CREATE TABLE `garmin_credentials` (
	`connectionId` int NOT NULL,
	`accessTokenCiphertext` text NOT NULL,
	`refreshTokenCiphertext` text,
	`accessTokenExpiresAt` timestamp,
	`refreshTokenExpiresAt` timestamp,
	`keyVersion` varchar(32) NOT NULL,
	`tokenFingerprint` varchar(64) NOT NULL,
	`rotatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `garmin_credentials_connectionId` PRIMARY KEY(`connectionId`)
);
--> statement-breakpoint
CREATE TABLE `garmin_daily_health` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` int NOT NULL,
	`sourceExternalId` varchar(191) NOT NULL,
	`metricDate` timestamp NOT NULL,
	`sleepSeconds` int,
	`restingHeartRate` int,
	`stressScore` int,
	`bodyBattery` int,
	`steps` int,
	`calories` int,
	`respiration` int,
	`sourceUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `garmin_daily_health_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `garmin_oauth_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stateHash` varchar(64) NOT NULL,
	`codeVerifierCiphertext` text,
	`returnUri` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `garmin_oauth_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `garmin_oauth_states_stateHash_unique` UNIQUE(`stateHash`)
);
--> statement-breakpoint
CREATE TABLE `garmin_sync_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` int NOT NULL,
	`requestedBy` enum('user','scheduled','retry') NOT NULL,
	`status` enum('queued','running','success','partial','failed') NOT NULL DEFAULT 'queued',
	`windowStart` timestamp,
	`windowEnd` timestamp,
	`recordsRead` int NOT NULL DEFAULT 0,
	`recordsWritten` int NOT NULL DEFAULT 0,
	`cursor` varchar(255),
	`errorCode` varchar(64),
	`startedAt` timestamp,
	`finishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `garmin_sync_runs_id` PRIMARY KEY(`id`)
);
