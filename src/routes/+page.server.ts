import { error } from '@sveltejs/kit';

import { requireUser } from '$lib/server/guards';
import { getWorkoutProgram } from '$lib/server/workouts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const currentUser = requireUser(event);
	if (!event.locals.db) error(500, 'Database is not configured.');

	try {
		return await getWorkoutProgram(event.locals.db, currentUser.id);
	} catch (cause) {
		console.error('Failed to load workouts:', cause);
		error(500, 'Unable to load the workout program. Apply the database migrations and try again.');
	}
};
