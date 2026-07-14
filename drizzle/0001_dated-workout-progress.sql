PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_workout_progress` (
	`user_id` text NOT NULL,
	`workout_id` integer NOT NULL,
	`completed_date` text NOT NULL,
	`completed_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `completed_date`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workout_id`) REFERENCES `workout`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_workout_progress_date_check" CHECK("__new_user_workout_progress"."completed_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
INSERT INTO `__new_user_workout_progress`("user_id", "workout_id", "completed_date", "completed_at")
SELECT
	progress."user_id",
	progress."workout_id",
	strftime('%Y-%m-', progress."completed_at", 'unixepoch') || printf('%02d', workout."day"),
	progress."completed_at"
FROM `user_workout_progress` AS progress
INNER JOIN `workout` AS workout ON workout."id" = progress."workout_id";--> statement-breakpoint
DROP TABLE `user_workout_progress`;--> statement-breakpoint
ALTER TABLE `__new_user_workout_progress` RENAME TO `user_workout_progress`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `user_workout_progress_workout_id_idx` ON `user_workout_progress` (`workout_id`);