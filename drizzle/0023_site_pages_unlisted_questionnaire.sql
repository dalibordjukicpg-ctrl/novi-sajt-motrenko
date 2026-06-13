ALTER TABLE `site_pages`
  ADD COLUMN `unlisted` boolean NOT NULL DEFAULT false AFTER `published`,
  ADD COLUMN `questionnaire_embed_url` varchar(2048) NULL AFTER `unlisted`;
