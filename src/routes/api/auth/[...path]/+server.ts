import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function handler({ locals, request }: Parameters<RequestHandler>[0]) {
	if (!locals.auth) error(500, 'Authentication is not configured.');
	return locals.auth.handler(request);
}

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;
export const PUT: RequestHandler = handler;
export const PATCH: RequestHandler = handler;
export const DELETE: RequestHandler = handler;
