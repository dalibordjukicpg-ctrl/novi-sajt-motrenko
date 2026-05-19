CREATE TABLE `home_service_cards` (
  `id` varchar(36) NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `icon_name` varchar(64) NOT NULL DEFAULT 'heart',
  `href` varchar(512) NOT NULL DEFAULT '#',
  `visible` boolean NOT NULL DEFAULT true,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `home_service_card_translations` (
  `id` varchar(36) NOT NULL,
  `card_id` varchar(36) NOT NULL,
  `locale` enum('me','en','ru') NOT NULL,
  `title` varchar(500) NOT NULL DEFAULT '',
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `home_card_trans_card_locale` (`card_id`,`locale`),
  CONSTRAINT `hsc_trans_card_fk` FOREIGN KEY (`card_id`) REFERENCES `home_service_cards` (`id`) ON DELETE CASCADE
);
