CREATE UNIQUE INDEX IF NOT EXISTS `idx_user_templates_one_primary` ON `user_templates` (`user_id`) WHERE "user_templates"."is_primary" = 1;
