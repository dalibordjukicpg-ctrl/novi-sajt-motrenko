CREATE TABLE IF NOT EXISTS `chatbot_settings` (
  `id` varchar(32) NOT NULL,
  `enabled` boolean NOT NULL DEFAULT true,
  `bot_name` varchar(80) NOT NULL DEFAULT 'ZygoBot',
  `avatar_media_id` varchar(36) NULL,
  `greeting_me` text NULL,
  `greeting_en` text NULL,
  `greeting_ru` text NULL,
  `greeting_delay_sec` int NOT NULL DEFAULT 3,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chatbot_knowledge` (
  `id` varchar(36) NOT NULL,
  `category` varchar(32) NOT NULL DEFAULT 'opste',
  `sort_order` int NOT NULL DEFAULT 0,
  `published` boolean NOT NULL DEFAULT true,
  `link_href` varchar(512) NULL,
  `created_at` datetime(3) NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `chatbot_knowledge_category_idx` (`category`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chatbot_knowledge_translations` (
  `id` varchar(36) NOT NULL,
  `entry_id` varchar(36) NOT NULL,
  `locale` enum('me','en','ru') NOT NULL,
  `question` varchar(500) NOT NULL,
  `keywords` varchar(1000) NULL,
  `answer` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chatbot_kt_entry_locale` (`entry_id`,`locale`),
  CONSTRAINT `chatbot_kt_entry_fk` FOREIGN KEY (`entry_id`) REFERENCES `chatbot_knowledge` (`id`) ON DELETE CASCADE
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chatbot_handoffs` (
  `id` varchar(36) NOT NULL,
  `locale` enum('me','en','ru') NOT NULL,
  `full_name` varchar(200) NOT NULL,
  `contact` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `consent_accepted` boolean NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'new',
  `email_sent` boolean NOT NULL DEFAULT false,
  `created_at` datetime(3) NOT NULL,
  `ip_address` varchar(45) NULL,
  `user_agent` varchar(512) NULL,
  PRIMARY KEY (`id`),
  KEY `chatbot_handoffs_created_at_idx` (`created_at`),
  KEY `chatbot_handoffs_status_idx` (`status`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chatbot_stats_daily` (
  `day` varchar(10) NOT NULL,
  `locale` varchar(8) NOT NULL,
  `event` varchar(24) NOT NULL,
  `entry_key` varchar(120) NOT NULL DEFAULT '',
  `count` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`day`,`locale`,`event`,`entry_key`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
