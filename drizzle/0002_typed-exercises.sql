ALTER TABLE `exercise` ADD `type` text DEFAULT 'timed' NOT NULL;--> statement-breakpoint
UPDATE `exercise`
SET `type` = 'reps'
WHERE `id` IN (
	SELECT `exercise_id`
	FROM `workout_exercise`
	WHERE `metric_type` = 'reps'
);--> statement-breakpoint
DELETE FROM `user_exercise_preference`
WHERE `exercise_id` IN (
	SELECT `id` FROM `exercise` WHERE `type` = 'timed'
);--> statement-breakpoint
ALTER TABLE `workout_exercise` DROP COLUMN `metric_type`;--> statement-breakpoint
CREATE TRIGGER `user_exercise_preference_reps_insert`
BEFORE INSERT ON `user_exercise_preference`
FOR EACH ROW
WHEN COALESCE((SELECT `type` FROM `exercise` WHERE `id` = NEW.`exercise_id`), 'timed') <> 'reps'
BEGIN
	SELECT RAISE(ABORT, 'speed preferences are only valid for rep-based exercises');
END;--> statement-breakpoint
CREATE TRIGGER `user_exercise_preference_reps_update`
BEFORE UPDATE ON `user_exercise_preference`
FOR EACH ROW
WHEN COALESCE((SELECT `type` FROM `exercise` WHERE `id` = NEW.`exercise_id`), 'timed') <> 'reps'
BEGIN
	SELECT RAISE(ABORT, 'speed preferences are only valid for rep-based exercises');
END;--> statement-breakpoint
SELECT 1;