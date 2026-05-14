CREATE TABLE `media_alt_translations` (
	`id` varchar(36) NOT NULL,
	`media_id` varchar(36) NOT NULL,
	`locale` enum('me','en','ru','tr') NOT NULL,
	`alt_text` varchar(512) NOT NULL DEFAULT '',
	CONSTRAINT `media_alt_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_alt_trans_media_locale` UNIQUE(`media_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `site_globals` (
	`id` varchar(32) NOT NULL,
	`logo_media_id` varchar(36),
	`favicon_media_id` varchar(36),
	`hero_bg_media_id` varchar(36),
	`analytics_head_html` text,
	`analytics_body_html` text,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `site_globals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `media_alt_translations` ADD CONSTRAINT `media_alt_translations_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE cascade ON UPDATE no action;