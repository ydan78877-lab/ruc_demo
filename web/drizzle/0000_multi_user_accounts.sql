CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`data_json` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`share_code` text,
	`source_template_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_templates_owner_user_id` ON `templates` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_templates_library_published_at` ON `templates` (`visibility`,`published_at`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_templates_share_code` ON `templates` (`share_code`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_templates` (
	`user_id` text NOT NULL,
	`template_id` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`installed_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_user_templates_user_template` ON `user_templates` (`user_id`,`template_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_user_templates_user_id` ON `user_templates` (`user_id`);
