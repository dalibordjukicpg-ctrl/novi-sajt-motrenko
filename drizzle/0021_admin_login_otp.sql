CREATE TABLE `admin_login_otp_challenges` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`secret_hash` varchar(64) NOT NULL,
	`otp_hash` varchar(64) NOT NULL,
	`otp_expires_at` datetime(3) NOT NULL,
	`wrong_attempts` int NOT NULL DEFAULT 0,
	`locked_until` datetime(3),
	`redirect_to` varchar(512) NOT NULL,
	`consumed_at` datetime(3),
	`ip_address` varchar(45),
	`user_agent` varchar(512),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `admin_login_otp_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_login_otp_sends` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `admin_login_otp_sends_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_trusted_devices` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	`ip_address` varchar(45),
	`user_agent` varchar(512),
	`created_at` datetime(3) NOT NULL,
	`last_used_at` datetime(3),
	CONSTRAINT `admin_trusted_devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admin_login_otp_challenges` ADD CONSTRAINT `admin_login_otp_challenges_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `admin_login_otp_sends` ADD CONSTRAINT `admin_login_otp_sends_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `admin_trusted_devices` ADD CONSTRAINT `admin_trusted_devices_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `admin_login_otp_challenges_user_id_idx` ON `admin_login_otp_challenges` (`user_id`);
--> statement-breakpoint
CREATE INDEX `admin_login_otp_challenges_otp_expires_at_idx` ON `admin_login_otp_challenges` (`otp_expires_at`);
--> statement-breakpoint
CREATE INDEX `admin_login_otp_sends_user_id_created_at_idx` ON `admin_login_otp_sends` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `admin_trusted_devices_user_id_idx` ON `admin_trusted_devices` (`user_id`);
--> statement-breakpoint
CREATE INDEX `admin_trusted_devices_expires_at_idx` ON `admin_trusted_devices` (`expires_at`);
