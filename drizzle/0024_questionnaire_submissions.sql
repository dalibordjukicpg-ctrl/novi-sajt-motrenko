CREATE TABLE `questionnaire_submissions` (
	`id` varchar(36) NOT NULL,
	`locale` enum('me','en','ru') NOT NULL,
	`female_name` varchar(200) NOT NULL,
	`female_email` varchar(255) NOT NULL,
	`male_name` varchar(200),
	`male_email` varchar(255),
	`phone` varchar(64),
	`form_data_json` longtext NOT NULL,
	`pdf_storage_key` varchar(512) NOT NULL,
	`pdf_filename` varchar(255) NOT NULL,
	`pdf_size_bytes` int NOT NULL,
	`staff_email_sent` boolean NOT NULL DEFAULT false,
	`staff_pdf_email_sent` boolean NOT NULL DEFAULT false,
	`patient_email_sent` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` varchar(512),
	CONSTRAINT `questionnaire_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `questionnaire_submissions_created_at_idx` ON `questionnaire_submissions` (`created_at`);--> statement-breakpoint
CREATE INDEX `questionnaire_submissions_female_email_idx` ON `questionnaire_submissions` (`female_email`);
