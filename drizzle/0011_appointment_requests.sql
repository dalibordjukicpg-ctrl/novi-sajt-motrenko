CREATE TABLE `appointment_requests` (
	`id` varchar(36) NOT NULL,
	`locale` enum('me','en','ru','tr') NOT NULL,
	`full_name` varchar(200) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(64) NOT NULL,
	`date_of_birth` varchar(32) NOT NULL,
	`visit_reason` enum('consultation','first_visit','follow_up','infertility','pregnancy','ultrasound','gynecology','other') NOT NULL,
	`visit_reason_other` varchar(500),
	`treatment_elsewhere` boolean,
	`treatment_elsewhere_note` text,
	`diagnoses_notes` text,
	`medications` text,
	`allergies` text,
	`last_menstruation_or_note` varchar(255),
	`partner_attending` enum('yes','no','na') NOT NULL DEFAULT 'na',
	`preferred_date` varchar(64),
	`preferred_time_window` enum('morning','midday','afternoon','flexible'),
	`contact_preference` enum('phone','email','whatsapp') NOT NULL,
	`consent_accepted` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` varchar(512),
	CONSTRAINT `appointment_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `appointment_requests_created_at_idx` ON `appointment_requests` (`created_at`);--> statement-breakpoint
CREATE INDEX `appointment_requests_locale_idx` ON `appointment_requests` (`locale`);