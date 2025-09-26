CREATE TABLE `feature_toggles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`audience` text DEFAULT 'all' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feature_toggles_key_unique` ON `feature_toggles` (`key`);