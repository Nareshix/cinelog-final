import { fail, redirect } from '@sveltejs/kit';
import { APP_PASS } from '$app/env/private';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const password = formData.get('password') as string;

		if (!password || password !== APP_PASS) {
			return fail(400, { error: 'Incorrect password' });
		}

		// Set a secure cookie that lasts 1 full year (31,536,000 seconds)
		cookies.set('cinelog_auth', APP_PASS, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: 60 * 60 * 24 * 365 // 1 year
		});

		throw redirect(303, '/');
	}
};