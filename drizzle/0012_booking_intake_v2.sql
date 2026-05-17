ALTER TABLE `appointment_requests` MODIFY `date_of_birth` varchar(32) NULL;--> statement-breakpoint
ALTER TABLE `appointment_requests` ADD `who_attends` enum('patient_only','couple_both','with_partner') NOT NULL DEFAULT 'patient_only';--> statement-breakpoint
ALTER TABLE `appointment_requests` ADD `partner_full_name` varchar(200);--> statement-breakpoint
ALTER TABLE `appointment_requests` ADD `partner_phone` varchar(64);--> statement-breakpoint
ALTER TABLE `appointment_requests` ADD `what_brought_you` text;--> statement-breakpoint
ALTER TABLE `appointment_requests` ADD `trying_conceive_duration` varchar(24);
