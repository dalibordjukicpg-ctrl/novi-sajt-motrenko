CREATE TABLE `nav_link_translations` (
	`id` varchar(36) NOT NULL,
	`nav_link_id` varchar(36) NOT NULL,
	`locale` enum('me','en','ru','tr') NOT NULL,
	`label` varchar(255) NOT NULL,
	CONSTRAINT `nav_link_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `nav_link_translations_link_locale` UNIQUE(`nav_link_id`,`locale`)
);
--> statement-breakpoint
CREATE TABLE `nav_links` (
	`id` varchar(36) NOT NULL,
	`parent_id` varchar(36),
	`sort_order` int NOT NULL DEFAULT 0,
	`href` varchar(512) NOT NULL DEFAULT '#',
	`visible` boolean NOT NULL DEFAULT true,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `nav_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_locale_strings` (
	`id` varchar(36) NOT NULL,
	`field_key` varchar(120) NOT NULL,
	`locale` enum('me','en','ru','tr') NOT NULL,
	`value` text NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `site_locale_strings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_locale_strings_key_locale` UNIQUE(`field_key`,`locale`)
);
--> statement-breakpoint
ALTER TABLE `nav_link_translations` ADD CONSTRAINT `nav_link_translations_nav_link_id_nav_links_id_fk` FOREIGN KEY (`nav_link_id`) REFERENCES `nav_links`(`id`) ON DELETE cascade ON UPDATE no action;