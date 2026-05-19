CREATE TABLE `home_team_highlights` (
  `id` varchar(36) NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `href` varchar(512) NOT NULL DEFAULT '#',
  `visible` boolean NOT NULL DEFAULT true,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
);

CREATE TABLE `home_team_highlight_translations` (
  `id` varchar(36) NOT NULL,
  `highlight_id` varchar(36) NOT NULL,
  `locale` enum('me','en','ru','tr') NOT NULL,
  `title` varchar(500) NOT NULL DEFAULT '',
  `teaser` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `home_team_hl_trans_hl_locale` (`highlight_id`,`locale`),
  CONSTRAINT `hth_trans_hl_fk` FOREIGN KEY (`highlight_id`) REFERENCES `home_team_highlights` (`id`) ON DELETE CASCADE
);
