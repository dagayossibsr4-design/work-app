CREATE TABLE `user_app_state` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_app_state_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_app_state_userId_unique` UNIQUE(`userId`)
);
