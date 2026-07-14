import { and, eq } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';

import { exercise, userExercisePreference } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	assertSameOrigin(event.request, event.url);
	const currentUser = requireUser(event);
	if (!event.locals.db) error(500, 'Database is not configured.');
	const exerciseId = readId(event.params.exerciseId);
	const speedPercent = await readSpeed(event.request);

	const [existingExercise] = await event.locals.db
		.select({ id: exercise.id, type: exercise.type })
		.from(exercise)
		.where(eq(exercise.id, exerciseId))
		.limit(1);
	if (!existingExercise) error(404, 'Exercise not found.');
	if (existingExercise.type !== 'reps') {
		error(400, 'Speed can only be configured for rep-based exercises.');
	}

	await event.locals.db
		.insert(userExercisePreference)
		.values({
			userId: currentUser.id,
			exerciseId,
			speedPercent,
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: [userExercisePreference.userId, userExercisePreference.exerciseId],
			set: { speedPercent, updatedAt: new Date() }
		});

	return json({ exerciseId, speedPercent });
};

export const DELETE: RequestHandler = async (event) => {
	assertSameOrigin(event.request, event.url);
	const currentUser = requireUser(event);
	if (!event.locals.db) error(500, 'Database is not configured.');
	const exerciseId = readId(event.params.exerciseId);

	await event.locals.db
		.delete(userExercisePreference)
		.where(
			and(
				eq(userExercisePreference.userId, currentUser.id),
				eq(userExercisePreference.exerciseId, exerciseId)
			)
		);

	return json({ exerciseId, speedPercent: 100 });
};

function readId(value: string): number {
	const id = Number(value);
	if (!Number.isSafeInteger(id) || id < 1) error(400, 'Invalid exercise id.');
	return id;
}

async function readSpeed(request: Request): Promise<number> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Expected a JSON body.');
	}

	const speedPercent =
		typeof body === 'object' && body !== null && 'speedPercent' in body
			? Number(body.speedPercent)
			: Number.NaN;
	if (!Number.isInteger(speedPercent) || speedPercent < 25 || speedPercent > 200) {
		error(400, 'Speed must be a whole percentage between 25 and 200.');
	}
	return speedPercent;
}

function assertSameOrigin(request: Request, url: URL) {
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin) error(403, 'Cross-origin request rejected.');
}
