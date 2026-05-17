CREATE TABLE `site_pages` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`published` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)),
	`updated_at` datetime(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP(3)) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `site_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_pages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `site_page_translations` (
	`id` varchar(36) NOT NULL,
	`page_id` varchar(36) NOT NULL,
	`locale` enum('me','en','ru','tr') NOT NULL,
	`title` varchar(500) NOT NULL,
	`body` text,
	CONSTRAINT `site_page_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_page_trans_page_locale_unique` UNIQUE(`page_id`,`locale`)
);
--> statement-breakpoint
ALTER TABLE `site_page_translations` ADD CONSTRAINT `site_page_translations_page_id_site_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `site_pages`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `posts` ADD `content_role` enum('blog','team') NOT NULL DEFAULT 'blog';
