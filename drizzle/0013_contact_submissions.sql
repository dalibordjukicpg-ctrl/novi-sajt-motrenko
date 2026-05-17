CREATE TABLE `contact_submissions` (
	`id` varchar(36) NOT NULL,
	`locale` enum('me','en','ru','tr') NOT NULL,
	`full_name` varchar(200) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(64) NOT NULL,
	`inquiry_type` varchar(500),
	`message` text NOT NULL,
	`consent_accepted` boolean NOT NULL,
	`email_sent` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` varchar(512),
	CONSTRAINT `contact_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `contact_submissions_created_at_idx` ON `contact_submissions` (`created_at`);--> statement-breakpoint
CREATE INDEX `contact_submissions_email_idx` ON `contact_submissions` (`email`);
