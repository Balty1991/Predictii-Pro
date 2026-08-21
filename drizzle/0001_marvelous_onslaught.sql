CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dailyPredictions` boolean NOT NULL DEFAULT true,
	`resultsConfirmed` boolean NOT NULL DEFAULT true,
	`oddsMovement` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `oddsSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`market` varchar(64) NOT NULL,
	`outcome` varchar(64) NOT NULL,
	`bookmakerSlug` varchar(80) NOT NULL,
	`bookmakerName` varchar(120),
	`decimalOdds` decimal(7,3) NOT NULL,
	`previousDecimalOdds` decimal(7,3),
	`openingDecimalOdds` decimal(7,3),
	`movement` enum('SHORTENING','DRIFTING'),
	`observedAt` timestamp NOT NULL,
	`openingAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oddsSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `predictionFavorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`predictionSelectionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `predictionFavorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `prediction_favorite_user_selection_unique` UNIQUE(`userId`,`predictionSelectionId`)
);
--> statement-breakpoint
CREATE TABLE `predictionSelections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`providerPredictionId` int,
	`market` varchar(64) NOT NULL,
	`outcome` varchar(64) NOT NULL,
	`label` varchar(180) NOT NULL,
	`predictedProbability` decimal(5,2) NOT NULL,
	`modelConfidence` decimal(6,4),
	`impliedProbability` decimal(5,2),
	`fairOdds` decimal(7,3),
	`currentOdds` decimal(7,3),
	`openingOdds` decimal(7,3),
	`expectedValue` decimal(7,4),
	`edge` decimal(6,2),
	`contextScore` decimal(5,2),
	`consensusScore` decimal(5,2),
	`grade` enum('A_PLUS','A','B','C','D','WATCH'),
	`valueStatus` enum('positive','neutral','negative','unavailable') NOT NULL DEFAULT 'unavailable',
	`recommendationStatus` enum('recommended','watch','excluded') NOT NULL DEFAULT 'watch',
	`settlementStatus` enum('pending','won','lost','void','cancelled') NOT NULL DEFAULT 'pending',
	`settledAt` timestamp,
	`aiExplanation` text,
	`aiExplanationUpdatedAt` timestamp,
	`reasonCodes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `predictionSelections_id` PRIMARY KEY(`id`),
	CONSTRAINT `prediction_selection_event_market_outcome_unique` UNIQUE(`eventId`,`market`,`outcome`)
);
--> statement-breakpoint
CREATE TABLE `predictionTickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int,
	`title` varchar(160) NOT NULL,
	`ticketType` enum('daily','long_run','custom','pyramid') NOT NULL DEFAULT 'daily',
	`targetOdds` decimal(7,3),
	`totalOdds` decimal(8,3) NOT NULL,
	`combinedProbability` decimal(6,2),
	`expectedValue` decimal(7,4),
	`riskLevel` enum('conservative','balanced','growth','aggressive') NOT NULL DEFAULT 'balanced',
	`status` enum('draft','published','won','lost','void','cancelled') NOT NULL DEFAULT 'draft',
	`startsAt` timestamp,
	`settledAt` timestamp,
	`strategyMetadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `predictionTickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `providerPredictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerPredictionId` int NOT NULL,
	`eventId` int NOT NULL,
	`modelVersion` varchar(64),
	`modelConfidence` decimal(6,4),
	`expectedHomeGoals` decimal(5,2),
	`expectedAwayGoals` decimal(5,2),
	`mostLikelyScore` varchar(16),
	`rawPayload` json NOT NULL,
	`sourceUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `providerPredictions_id` PRIMARY KEY(`id`),
	CONSTRAINT `provider_predictions_provider_unique` UNIQUE(`providerPredictionId`),
	CONSTRAINT `provider_predictions_event_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
CREATE TABLE `pyramidPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`status` enum('active','completed','reset','paused') NOT NULL DEFAULT 'active',
	`baseStake` decimal(10,2) NOT NULL,
	`currentBankroll` decimal(10,2) NOT NULL,
	`targetOddsMin` decimal(6,3) NOT NULL,
	`targetOddsMax` decimal(6,3) NOT NULL,
	`reinvestRate` decimal(5,4) NOT NULL,
	`profitLockRate` decimal(5,4) NOT NULL DEFAULT '0.0000',
	`maxSteps` int NOT NULL,
	`currentStep` int NOT NULL DEFAULT 1,
	`configuration` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pyramidPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pyramidSteps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pyramidPlanId` int NOT NULL,
	`ticketId` int,
	`stepNumber` int NOT NULL,
	`stake` decimal(10,2) NOT NULL,
	`retainedProfit` decimal(10,2) NOT NULL DEFAULT '0.00',
	`projectedReturn` decimal(10,2),
	`status` enum('planned','active','won','lost','void','skipped') NOT NULL DEFAULT 'planned',
	`settledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pyramidSteps_id` PRIMARY KEY(`id`),
	CONSTRAINT `pyramid_step_number_unique` UNIQUE(`pyramidPlanId`,`stepNumber`)
);
--> statement-breakpoint
CREATE TABLE `sportsEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`providerEventId` int NOT NULL,
	`sport` varchar(32) NOT NULL,
	`competitionId` int,
	`competitionName` varchar(180),
	`seasonId` int,
	`homeTeamId` int,
	`homeTeamName` varchar(160) NOT NULL,
	`awayTeamId` int,
	`awayTeamName` varchar(160) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`status` enum('upcoming','live','finished','cancelled','postponed','unresolved') NOT NULL DEFAULT 'upcoming',
	`homeScore` int,
	`awayScore` int,
	`halftimeHomeScore` int,
	`halftimeAwayScore` int,
	`hasXg` boolean NOT NULL DEFAULT false,
	`rawPayload` json,
	`sourceUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sportsEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `sports_events_provider_event_unique` UNIQUE(`providerEventId`)
);
--> statement-breakpoint
CREATE TABLE `syncRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobType` enum('daily_predictions','odds_delta','results_confirmation','explanations') NOT NULL,
	`status` enum('started','completed','partial','failed','skipped') NOT NULL DEFAULT 'started',
	`scheduleCronTaskUid` varchar(65),
	`cursorValue` varchar(128),
	`summary` json,
	`errorMessage` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `syncRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticketSelections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`predictionSelectionId` int NOT NULL,
	`position` int NOT NULL,
	`oddsAtSelection` decimal(7,3) NOT NULL,
	`status` enum('pending','won','lost','void','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticketSelections_id` PRIMARY KEY(`id`),
	CONSTRAINT `ticket_selection_position_unique` UNIQUE(`ticketId`,`position`),
	CONSTRAINT `ticket_selection_item_unique` UNIQUE(`ticketId`,`predictionSelectionId`)
);
--> statement-breakpoint
CREATE TABLE `userNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationType` enum('daily_predictions','results_confirmed','odds_movement','system') NOT NULL,
	`title` varchar(160) NOT NULL,
	`content` text NOT NULL,
	`destination` varchar(512),
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `timezone` varchar(64) DEFAULT 'Europe/Bucharest' NOT NULL;--> statement-breakpoint
ALTER TABLE `notificationPreferences` ADD CONSTRAINT `notificationPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `oddsSnapshots` ADD CONSTRAINT `oddsSnapshots_eventId_sportsEvents_id_fk` FOREIGN KEY (`eventId`) REFERENCES `sportsEvents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictionFavorites` ADD CONSTRAINT `predictionFavorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictionFavorites` ADD CONSTRAINT `predictionFavorites_predictionSelectionId_predictionSelections_id_fk` FOREIGN KEY (`predictionSelectionId`) REFERENCES `predictionSelections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictionSelections` ADD CONSTRAINT `predictionSelections_eventId_sportsEvents_id_fk` FOREIGN KEY (`eventId`) REFERENCES `sportsEvents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictionSelections` ADD CONSTRAINT `predictionSelections_providerPredictionId_providerPredictions_id_fk` FOREIGN KEY (`providerPredictionId`) REFERENCES `providerPredictions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictionTickets` ADD CONSTRAINT `predictionTickets_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `providerPredictions` ADD CONSTRAINT `providerPredictions_eventId_sportsEvents_id_fk` FOREIGN KEY (`eventId`) REFERENCES `sportsEvents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pyramidPlans` ADD CONSTRAINT `pyramidPlans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pyramidSteps` ADD CONSTRAINT `pyramidSteps_pyramidPlanId_pyramidPlans_id_fk` FOREIGN KEY (`pyramidPlanId`) REFERENCES `pyramidPlans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pyramidSteps` ADD CONSTRAINT `pyramidSteps_ticketId_predictionTickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `predictionTickets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticketSelections` ADD CONSTRAINT `ticketSelections_ticketId_predictionTickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `predictionTickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticketSelections` ADD CONSTRAINT `ticketSelections_predictionSelectionId_predictionSelections_id_fk` FOREIGN KEY (`predictionSelectionId`) REFERENCES `predictionSelections`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userNotifications` ADD CONSTRAINT `userNotifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `odds_snapshot_event_market_idx` ON `oddsSnapshots` (`eventId`,`market`,`outcome`);--> statement-breakpoint
CREATE INDEX `odds_snapshot_observed_idx` ON `oddsSnapshots` (`observedAt`);--> statement-breakpoint
CREATE INDEX `prediction_selection_recommendation_idx` ON `predictionSelections` (`recommendationStatus`,`grade`);--> statement-breakpoint
CREATE INDEX `prediction_selection_settlement_idx` ON `predictionSelections` (`settlementStatus`);--> statement-breakpoint
CREATE INDEX `prediction_selection_event_idx` ON `predictionSelections` (`eventId`);--> statement-breakpoint
CREATE INDEX `prediction_tickets_status_idx` ON `predictionTickets` (`status`,`ticketType`);--> statement-breakpoint
CREATE INDEX `prediction_tickets_creator_idx` ON `predictionTickets` (`createdByUserId`);--> statement-breakpoint
CREATE INDEX `pyramid_plan_user_status_idx` ON `pyramidPlans` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `pyramid_step_status_idx` ON `pyramidSteps` (`status`);--> statement-breakpoint
CREATE INDEX `sports_events_starts_at_idx` ON `sportsEvents` (`startsAt`);--> statement-breakpoint
CREATE INDEX `sports_events_sport_status_idx` ON `sportsEvents` (`sport`,`status`);--> statement-breakpoint
CREATE INDEX `sports_events_competition_idx` ON `sportsEvents` (`competitionId`);--> statement-breakpoint
CREATE INDEX `sync_runs_job_status_idx` ON `syncRuns` (`jobType`,`status`);--> statement-breakpoint
CREATE INDEX `sync_runs_cron_uid_idx` ON `syncRuns` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `user_notifications_user_read_idx` ON `userNotifications` (`userId`,`readAt`);