/** Body kolone: TEXT (64KB) → LONGTEXT za dugačke WP post_content HTML-e. */
ALTER TABLE `post_translations` MODIFY COLUMN `body` longtext;
--> statement-breakpoint
ALTER TABLE `site_page_translations` MODIFY COLUMN `body` longtext;
