import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';

import { userWorkoutProgress, workout } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	assertSameOrigin(event.request, event.url);
	const currentUser = requireUser(event);
	if (!event.locals.db) error(500, 'Database is not configured.');
	const workoutId = readId(event.params.workoutId);
	const completedDate = await readCompletedDate(event.request);

	const [existingWorkout] = await event.locals.db
		.select({ id: workout.id, day: workout.day })
		.from(workout)
		.where(eq(workout.id, workoutId))
		.limit(1);
	if (!existingWorkout) error(404, 'Workout not found.');
	if (existingWorkout.day !== Number(completedDate.slice(-2))) {
		error(400, 'The completion date does not match the workout day.');
	}

	await event.locals.db
		.insert(userWorkoutProgress)
		.values({ userId: currentUser.id, workoutId, completedDate, completedAt: new Date() })
		.onConflictDoUpdate({
			target: [userWorkoutProgress.userId, userWorkoutProgress.completedDate],
			set: { workoutId, completedAt: new Date() }
		});

	return json({ completed: true, completedDate });
};

export const DELETE: RequestHandler = async (event) => {
	assertSameOrigin(event.request, event.url);
	const currentUser = requireUser(event);
	if (!event.locals.db) error(500, 'Database is not configured.');
	const workoutId = readId(event.params.workoutId);
	const completedDate = validateDate(event.url.searchParams.get('date'));

	await event.locals.db
		.delete(userWorkoutProgress)
		.where(
			and(
				eq(userWorkoutProgress.userId, currentUser.id),
				eq(userWorkoutProgress.workoutId, workoutId),
				eq(userWorkoutProgress.completedDate, completedDate)
			)
		);

	return json({ completed: false, completedDate });
};

function readId(value: string): number {
	const id = Number(value);
	if (!Number.isSafeInteger(id) || id < 1) error(400, 'Invalid workout id.');
	return id;
}

async function readCompletedDate(request: Request): Promise<string> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Expected a JSON body.');
	}

	const completedDate =
		typeof body === 'object' && body !== null && 'completedDate' in body
			? body.completedDate
			: null;
	return validateDate(completedDate);
}

function validateDate(value: unknown): string {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		error(400, 'Expected a completion date in YYYY-MM-DD format.');
	}
	const parsed = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
		error(400, 'Invalid completion date.');
	}
	return value;
}

function assertSameOrigin(request: Request, url: URL) {
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin) error(403, 'Cross-origin request rejected.');
}
