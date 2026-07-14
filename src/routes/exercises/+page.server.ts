import { error } from '@sveltejs/kit';

import { requireUser } from '$lib/server/guards';
import { getExercisePreferences } from '$lib/server/workouts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const currentUser = requireUser(event);
	if (!event.locals.db) error(500, 'Database is not configured.');

	try {
		return { exercises: await getExercisePreferences(event.locals.db, currentUser.id) };
	} catch (cause) {
		console.error('Failed to load exercises:', cause);
		error(500, 'Unable to load exercises.');
	}
};
