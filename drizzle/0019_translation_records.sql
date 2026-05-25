CREATE TABLE `translation_records` (
  `id` varchar(36) NOT NULL,
  `entity_type` enum('site_page','post','nav_link','site_string','team_highlight') NOT NULL,
  `entity_id` varchar(120) NOT NULL,
  `source_locale` enum('me','en','ru') NOT NULL DEFAULT 'me',
  `target_locale` enum('me','en','ru') NOT NULL,
  `translation_status` enum('missing','pending','machine','human','stale','failed') NOT NULL DEFAULT 'missing',
  `translated_at` datetime(3) NULL,
  `translation_provider` varchar(32) NULL,
  `source_hash` varchar(64) NULL,
  `error_message` text NULL,
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tr_entity_target_locale` (`entity_type`,`entity_id`,`target_locale`),
  KEY `tr_status` (`translation_status`)
);
