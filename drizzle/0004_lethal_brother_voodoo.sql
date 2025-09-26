PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_restaurants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`upi_id` text NOT NULL,
	`address` text,
	`city` text,
	`state` text,
	`country` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_restaurants`("id", "owner_user_id", "name", "upi_id", "address", "city", "state", "country", "created_at") SELECT "id", "owner_user_id", "name", "upi_id", "address", "city", "state", "country", "created_at" FROM `restaurants`;--> statement-breakpoint
DROP TABLE `restaurants`;--> statement-breakpoint
ALTER TABLE `__new_restaurants` RENAME TO `restaurants`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_member_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`tip_id` integer,
	`approved` integer DEFAULT true NOT NULL,
	`approved_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tip_id`) REFERENCES `tips`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_reviews`("id", "staff_member_id", "rating", "comment", "tip_id", "approved", "approved_by", "created_at") SELECT "id", "staff_member_id", "rating", "comment", "tip_id", "approved", "approved_by", "created_at" FROM `reviews`;--> statement-breakpoint
DROP TABLE `reviews`;--> statement-breakpoint
ALTER TABLE `__new_reviews` RENAME TO `reviews`;--> statement-breakpoint
CREATE TABLE `__new_staff_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`restaurant_id` integer NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'server' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`qr_key` text NOT NULL,
	`upi_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_staff_members`("id", "user_id", "restaurant_id", "display_name", "role", "status", "qr_key", "upi_id", "created_at") SELECT "id", "user_id", "restaurant_id", "display_name", "role", "status", "qr_key", "upi_id", "created_at" FROM `staff_members`;--> statement-breakpoint
DROP TABLE `staff_members`;--> statement-breakpoint
ALTER TABLE `__new_staff_members` RENAME TO `staff_members`;--> statement-breakpoint
CREATE UNIQUE INDEX `staff_members_qr_key_unique` ON `staff_members` (`qr_key`);