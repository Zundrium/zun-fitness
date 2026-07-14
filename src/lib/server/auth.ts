import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';

import { createDb } from './db';
import { schema } from './db/schema';

type RuntimeEnv = {
	DB: D1Database;
	APP_URL?: string;
	BETTER_AUTH_URL?: string;
	BETTER_AUTH_SECRET?: string;
	BETTER_AUTH_TRUSTED_ORIGINS?: string;
};

export function createAuth(env: RuntimeEnv, origin = 'http://localhost:3000') {
	const appUrl = resolveAppUrl(env, origin);

	return betterAuth({
		secret:
			readString(env.BETTER_AUTH_SECRET) || 'development-only-change-me-minimum-32-characters',
		baseURL: appUrl,
		basePath: '/api/auth',
		trustedOrigins: uniqueStrings([
			toOrigin(appUrl),
			toOrigin(origin),
			...readString(env.BETTER_AUTH_TRUSTED_ORIGINS)
				.split(',')
				.map((value) => toOrigin(value.trim()))
		]),
		database: drizzleAdapter(createDb(env.DB), {
			provider: 'sqlite',
			schema
		}),
		emailAndPassword: {
			enabled: true,
			minPasswordLength: 8,
			revokeSessionsOnPasswordReset: true
		}
	});
}

export type AppAuth = ReturnType<typeof createAuth>;
export type AuthSession = Awaited<ReturnType<AppAuth['api']['getSession']>>;
export type AuthUser = NonNullable<AuthSession>['user'];

function resolveAppUrl(env: RuntimeEnv, origin: string): string {
	const requestOrigin = toOrigin(origin) || 'http://localhost:3000';
	const configuredUrl = readString(env.BETTER_AUTH_URL) || readString(env.APP_URL);

	if (isLoopbackOrigin(requestOrigin)) return requestOrigin;
	return configuredUrl || requestOrigin;
}

function toOrigin(value: string): string {
	try {
		return new URL(value).origin;
	} catch {
		return '';
	}
}

function isLoopbackOrigin(origin: string): boolean {
	try {
		const hostname = new URL(origin).hostname;
		return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
	} catch {
		return false;
	}
}

function uniqueStrings(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}

function readString(value: unknown): string {
	return typeof value === 'string' ? value : '';
}
