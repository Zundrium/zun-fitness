import { and, countDistinct, eq } from 'drizzle-orm';

import type {
	CompletedWorkoutDay,
	ExercisePreference,
	Workout,
	WorkoutProgram
} from '$lib/workouts/types';
import type { Database } from './db';
import {
	exercise,
	program,
	userExercisePreference,
	userWorkoutProgress,
	workout,
	workoutExercise
} from './db/schema';

export async function getWorkoutProgram(
	db: Database,
	userId: string
): Promise<{ program: WorkoutProgram; completedDays: CompletedWorkoutDay[] }> {
	const rows = await db
		.select({
			programId: program.id,
			programName: program.name,
			programDescription: program.description,
			durationDays: program.durationDays,
			workoutId: workout.id,
			day: workout.day,
			title: workout.title,
			description: workout.description,
			workoutImageUrl: workout.imageUrl,
			sets: workout.sets,
			restBetweenExercises: workout.restBetweenExercises,
			restBetweenSets: workout.restBetweenSets,
			workoutExerciseId: workoutExercise.id,
			position: workoutExercise.position,
			amount: workoutExercise.amount,
			exerciseId: exercise.id,
			exerciseSlug: exercise.slug,
			exerciseType: exercise.type,
			exerciseName: exercise.name,
			exerciseImageUrl: exercise.imageUrl,
			speedPercent: userExercisePreference.speedPercent
		})
		.from(program)
		.innerJoin(workout, eq(workout.programId, program.id))
		.innerJoin(workoutExercise, eq(workoutExercise.workoutId, workout.id))
		.innerJoin(exercise, eq(exercise.id, workoutExercise.exerciseId))
		.leftJoin(
			userExercisePreference,
			and(
				eq(userExercisePreference.exerciseId, exercise.id),
				eq(userExercisePreference.userId, userId)
			)
		)
		.where(eq(program.slug, 'total-body-30'))
		.orderBy(workout.day, workoutExercise.position);

	if (!rows[0]) throw new Error('The workout program has not been seeded.');

	const workouts = new Map<number, Workout>();
	for (const row of rows) {
		let currentWorkout = workouts.get(row.workoutId);
		if (!currentWorkout) {
			currentWorkout = {
				id: row.workoutId,
				day: row.day,
				title: row.title,
				description: row.description,
				imageUrl: row.workoutImageUrl,
				sets: row.sets,
				restBetweenExercises: row.restBetweenExercises,
				restBetweenSets: row.restBetweenSets,
				activities: []
			};
			workouts.set(row.workoutId, currentWorkout);
		}

		const activity = {
			id: row.workoutExerciseId,
			exerciseId: row.exerciseId,
			slug: row.exerciseSlug,
			name: row.exerciseName,
			imageUrl: row.exerciseImageUrl,
			amount: row.amount
		};
		if (row.exerciseType === 'reps') {
			currentWorkout.activities.push({
				...activity,
				type: 'reps',
				speedPercent: row.speedPercent ?? 100
			});
		} else {
			currentWorkout.activities.push({ ...activity, type: 'timed' });
		}
	}

	const progressRows = await db
		.select({
			workoutId: userWorkoutProgress.workoutId,
			dateKey: userWorkoutProgress.completedDate
		})
		.from(userWorkoutProgress)
		.innerJoin(workout, eq(workout.id, userWorkoutProgress.workoutId))
		.where(
			and(eq(userWorkoutProgress.userId, userId), eq(workout.programId, rows[0].programId))
		);

	return {
		program: {
			id: rows[0].programId,
			name: rows[0].programName,
			description: rows[0].programDescription,
			durationDays: rows[0].durationDays,
			workouts: [...workouts.values()]
		},
		completedDays: progressRows
	};
}

export async function getExercisePreferences(
	db: Database,
	userId: string
): Promise<ExercisePreference[]> {
	const rows = await db
		.select({
			id: exercise.id,
			slug: exercise.slug,
			name: exercise.name,
			type: exercise.type,
			imageUrl: exercise.imageUrl,
			speedPercent: userExercisePreference.speedPercent,
			workoutCount: countDistinct(workoutExercise.workoutId)
		})
		.from(exercise)
		.leftJoin(workoutExercise, eq(workoutExercise.exerciseId, exercise.id))
		.leftJoin(
			userExercisePreference,
			and(
				eq(userExercisePreference.exerciseId, exercise.id),
				eq(userExercisePreference.userId, userId)
			)
		)
		.where(eq(exercise.type, 'reps'))
		.groupBy(exercise.id)
		.orderBy(exercise.name);

	return rows.map((row) => ({
		id: row.id,
		slug: row.slug,
		name: row.name,
		type: 'reps',
		imageUrl: row.imageUrl,
		speedPercent: row.speedPercent ?? 100,
		workoutCount: row.workoutCount
	}));
}
