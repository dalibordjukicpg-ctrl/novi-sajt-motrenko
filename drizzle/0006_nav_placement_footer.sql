ALTER TABLE `nav_links` ADD `placement` enum('header','footer') DEFAULT 'header' NOT NULL;--> statement-breakpoint
ALTER TABLE `nav_links` ADD `footer_column` int DEFAULT 0 NOT NULL;