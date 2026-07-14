import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export function requireUser(event: Pick<RequestEvent, 'locals' | 'url'>) {
	if (!event.locals.user) {
		const redirectTo = `${event.url.pathname}${event.url.search}`;
		redirect(303, `/sign-in?redirect=${encodeURIComponent(redirectTo)}`);
	}
	return event.locals.user;
}
