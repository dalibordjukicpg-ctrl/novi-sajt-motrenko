ALTER TABLE `site_globals` ADD `maintenance_enabled` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `site_globals` ADD `maintenance_title` varchar(255);--> statement-breakpoint
ALTER TABLE `site_globals` ADD `maintenance_message` text;--> statement-breakpoint
ALTER TABLE `site_globals` ADD `maintenance_logo_media_id` varchar(36);
