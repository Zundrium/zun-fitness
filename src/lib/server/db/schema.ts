import { relations, sql } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' })
		.$defaultFn(() => false)
		.notNull(),
	image: text('image'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.$defaultFn(() => new Date())
		.notNull()
});

export const session = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
		token: text('token').notNull().unique(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_user_id_idx').on(table.userId)]
);

export const account = sqliteTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
		refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
		scope: text('scope'),
		password: text('password'),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [index('account_user_id_idx').on(table.userId)]
);

export const verification = sqliteTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
});

export const program = sqliteTable('program', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description').notNull(),
	durationDays: integer('duration_days').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.default(sql`(unixepoch())`)
		.notNull()
});

export const workout = sqliteTable(
	'workout',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		programId: integer('program_id')
			.notNull()
			.references(() => program.id, { onDelete: 'cascade' }),
		day: integer('day').notNull(),
		title: text('title').notNull(),
		description: text('description').notNull(),
		imageUrl: text('image_url').notNull(),
		sets: integer('sets').notNull(),
		restBetweenExercises: integer('rest_between_exercises').notNull(),
		restBetweenSets: integer('rest_between_sets').notNull()
	},
	(table) => [
		uniqueIndex('workout_program_day_idx').on(table.programId, table.day),
		index('workout_program_id_idx').on(table.programId)
	]
);

export const exercise = sqliteTable('exercise', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	type: text('type', { enum: ['reps', 'timed'] }).notNull().default('timed'),
	imageUrl: text('image_url').notNull()
});

export const workoutExercise = sqliteTable(
	'workout_exercise',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		workoutId: integer('workout_id')
			.notNull()
			.references(() => workout.id, { onDelete: 'cascade' }),
		exerciseId: integer('exercise_id')
			.notNull()
			.references(() => exercise.id, { onDelete: 'restrict' }),
		position: integer('position').notNull(),
		amount: integer('amount').notNull()
	},
	(table) => [
		uniqueIndex('workout_exercise_position_idx').on(table.workoutId, table.position),
		index('workout_exercise_workout_id_idx').on(table.workoutId),
		index('workout_exercise_exercise_id_idx').on(table.exerciseId),
		check('workout_exercise_amount_check', sql`${table.amount} > 0`)
	]
);

export const userWorkoutProgress = sqliteTable(
	'user_workout_progress',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		workoutId: integer('workout_id')
			.notNull()
			.references(() => workout.id, { onDelete: 'cascade' }),
		completedDate: text('completed_date').notNull(),
		completedAt: integer('completed_at', { mode: 'timestamp' })
			.$defaultFn(() => new Date())
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.completedDate] }),
		index('user_workout_progress_workout_id_idx').on(table.workoutId),
		check(
			'user_workout_progress_date_check',
			sql`${table.completedDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		)
	]
);

export const userExercisePreference = sqliteTable(
	'user_exercise_preference',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		exerciseId: integer('exercise_id')
			.notNull()
			.references(() => exercise.id, { onDelete: 'cascade' }),
		speedPercent: integer('speed_percent').notNull().default(100),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.$defaultFn(() => new Date())
			.notNull()
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.exerciseId] }),
		index('user_exercise_preference_exercise_id_idx').on(table.exerciseId),
		check(
			'user_exercise_preference_speed_check',
			sql`${table.speedPercent} >= 25 AND ${table.speedPercent} <= 200`
		)
	]
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	progress: many(userWorkoutProgress),
	exercisePreferences: many(userExercisePreference)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] })
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] })
}));

export const programRelations = relations(program, ({ many }) => ({
	workouts: many(workout)
}));

export const workoutRelations = relations(workout, ({ one, many }) => ({
	program: one(program, { fields: [workout.programId], references: [program.id] }),
	exercises: many(workoutExercise),
	progress: many(userWorkoutProgress)
}));

export const exerciseRelations = relations(exercise, ({ many }) => ({
	workouts: many(workoutExercise),
	preferences: many(userExercisePreference)
}));

export const workoutExerciseRelations = relations(workoutExercise, ({ one }) => ({
	workout: one(workout, { fields: [workoutExercise.workoutId], references: [workout.id] }),
	exercise: one(exercise, {
		fields: [workoutExercise.exerciseId],
		references: [exercise.id]
	})
}));

export const schema = {
	user,
	session,
	account,
	verification,
	program,
	workout,
	exercise,
	workoutExercise,
	userWorkoutProgress,
	userExercisePreference
};

export type User = typeof user.$inferSelect;
