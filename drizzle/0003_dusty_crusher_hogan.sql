CREATE TABLE `restaurants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_user_id` integer NOT NULL,
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
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_member_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`tip_id` integer,
	`approved` integer DEFAULT true NOT NULL,
	`approved_by` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tip_id`) REFERENCES `tips`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `staff_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
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
CREATE UNIQUE INDEX `staff_members_qr_key_unique` ON `staff_members` (`qr_key`);--> statement-breakpoint
CREATE TABLE `tips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_member_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`payer_name` text,
	`message` text,
	`source` text DEFAULT 'qr' NOT NULL,
	`status` text DEFAULT 'succeeded' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`staff_member_id`) REFERENCES `staff_members`(`id`) ON UPDATE no action ON DELETE no action
);
