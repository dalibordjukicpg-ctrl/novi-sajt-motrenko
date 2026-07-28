ALTER TABLE `posts` ADD `team_role` enum('doctor','embryologist','nurse');
--> statement-breakpoint
UPDATE `posts` p
INNER JOIN `post_translations` t ON t.`post_id` = p.`id` AND t.`locale` = 'me'
SET p.`team_role` = CASE
  WHEN LOWER(t.`title`) LIKE 'dr %'
    OR LOWER(t.`title`) LIKE 'dr.%'
    OR LOWER(t.`title`) LIKE 'doktor%'
    OR LOWER(t.`title`) LIKE 'doktorka%'
    OR LOWER(t.`title`) LIKE 'mr sci dr%'
    OR LOWER(t.`title`) LIKE 'mr. sci. dr%'
    OR LOWER(t.`title`) LIKE 'mr dr%'
    OR LOWER(t.`title`) LIKE 'mr. dr%'
    OR LOWER(t.`title`) LIKE 'prim%dr%'
    THEN 'doctor'
  WHEN LOWER(t.`title`) LIKE '%embriolog%' THEN 'embryologist'
  WHEN LOWER(t.`title`) LIKE '%sestr%'
    OR LOWER(t.`title`) LIKE '%tehničar%'
    OR LOWER(t.`title`) LIKE '%tehnicar%'
    OR LOWER(t.`title`) LIKE '%koordinator%'
    THEN 'nurse'
  ELSE NULL
END
WHERE p.`content_role` = 'team' AND p.`team_role` IS NULL;
