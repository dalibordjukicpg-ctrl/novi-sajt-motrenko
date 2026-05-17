CREATE TABLE `analytics_visits` (
	`id` varchar(36) NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`path` varchar(2048) NOT NULL,
	`locale` varchar(8),
	`referrer` varchar(2048),
	`referrer_host` varchar(255),
	`country_code` varchar(2),
	`region` varchar(128),
	`city` varchar(128),
	`device_type` varchar(16) NOT NULL DEFAULT 'unknown',
	`browser` varchar(80),
	`os_name` varchar(80),
	`is_bot` boolean NOT NULL DEFAULT false,
	`visitor_hash` varchar(64) NOT NULL,
	CONSTRAINT `analytics_visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `analytics_visits_occurred_at_idx` ON `analytics_visits` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `analytics_visits_country_idx` ON `analytics_visits` (`country_code`);--> statement-breakpoint
CREATE INDEX `analytics_visits_bot_idx` ON `analytics_visits` (`is_bot`);
