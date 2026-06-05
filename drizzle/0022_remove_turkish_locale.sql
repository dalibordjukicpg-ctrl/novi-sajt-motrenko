DELETE FROM `site_locale_strings` WHERE `locale` = 'tr';
--> statement-breakpoint
DELETE FROM `nav_link_translations` WHERE `locale` = 'tr';
--> statement-breakpoint
DELETE FROM `post_translations` WHERE `locale` = 'tr';
--> statement-breakpoint
DELETE FROM `site_page_translations` WHERE `locale` = 'tr';
--> statement-breakpoint
DELETE FROM `media_alt_translations` WHERE `locale` = 'tr';
--> statement-breakpoint
DELETE FROM `home_service_card_translations` WHERE `locale` = 'tr';
--> statement-breakpoint
DELETE FROM `home_team_highlight_translations` WHERE `locale` = 'tr';
--> statement-breakpoint
DELETE FROM `translation_records` WHERE `source_locale` = 'tr' OR `target_locale` = 'tr';
--> statement-breakpoint
DELETE FROM `appointment_requests` WHERE `locale` = 'tr';
--> statement-breakpoint
DELETE FROM `contact_submissions` WHERE `locale` = 'tr';
--> statement-breakpoint
UPDATE `analytics_visits` SET `locale` = NULL WHERE `locale` = 'tr';
--> statement-breakpoint
ALTER TABLE `site_locale_strings` MODIFY `locale` enum('me','en','ru') NOT NULL;
--> statement-breakpoint
ALTER TABLE `nav_link_translations` MODIFY `locale` enum('me','en','ru') NOT NULL;
--> statement-breakpoint
ALTER TABLE `post_translations` MODIFY `locale` enum('me','en','ru') NOT NULL;
--> statement-breakpoint
ALTER TABLE `site_page_translations` MODIFY `locale` enum('me','en','ru') NOT NULL;
--> statement-breakpoint
ALTER TABLE `media_alt_translations` MODIFY `locale` enum('me','en','ru') NOT NULL;
--> statement-breakpoint
ALTER TABLE `appointment_requests` MODIFY `locale` enum('me','en','ru') NOT NULL;
--> statement-breakpoint
ALTER TABLE `contact_submissions` MODIFY `locale` enum('me','en','ru') NOT NULL;
