CREATE TABLE `media` (
	`id` varchar(36) NOT NULL,
	`filename` varchar(512) NOT NULL,
	`storage_key` varchar(1024) NOT NULL,
	`mime_type` varchar(128) NOT NULL,
	`size_bytes` int NOT NULL,
	`width` int,
	`height` int,
	`alt_text` varchar(512),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_translations` (
	`id` varchar(36) NOT NULL,
	`post_id` varchar(36) NOT NULL,
	`locale` enum('me','en','ru','tr') NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(500) NOT NULL,
	`excerpt` text,
	`body` text,
	`meta_title` varchar(255),
	`meta_description` varchar(512),
	CONSTRAINT `post_translations_id` PRIMARY KEY(`id`),
	CONSTRAINT `post_translations_post_id_locale` UNIQUE(`post_id`,`locale`),
	CONSTRAINT `post_translations_locale_slug` UNIQUE(`locale`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` varchar(36) NOT NULL,
	`published` boolean NOT NULL DEFAULT false,
	`published_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `post_translations` ADD CONSTRAINT `post_translations_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE cascade ON UPDATE no action;