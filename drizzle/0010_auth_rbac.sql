CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`actor_user_id` varchar(36),
	`action` varchar(120) NOT NULL,
	`subject_type` varchar(64),
	`subject_id` varchar(64),
	`metadata` text,
	`ip_address` varchar(45),
	`user_agent` varchar(512),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	`ip_address` varchar(45),
	`user_agent` varchar(512),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_assignments` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`content_resource_type` enum('post','site_page') NOT NULL,
	`resource_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `content_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_assign_user_resource` UNIQUE(`user_id`,`content_resource_type`,`resource_id`)
);
--> statement-breakpoint
CREATE TABLE `email_verification_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `email_verification_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `role` enum('SUPER_ADMIN','ADMIN','STAFF','USER') DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `is_active` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified_at` datetime(3);--> statement-breakpoint
ALTER TABLE `users` ADD `last_login_at` datetime(3);--> statement-breakpoint
UPDATE `users` SET `role` = 'ADMIN' WHERE `role` = 'USER';--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_assignments` ADD CONSTRAINT `content_assignments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_verification_tokens` ADD CONSTRAINT `email_verification_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_logs_actor_user_id_idx` ON `audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_id_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expires_at_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `content_assignments_user_id_idx` ON `content_assignments` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_verification_tokens_user_id_idx` ON `email_verification_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_id_idx` ON `password_reset_tokens` (`user_id`);