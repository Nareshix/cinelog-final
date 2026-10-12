import { APP_PASS } from '$app/env/private';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Block non-SG bots
	const country = event.request.headers.get('cf-ipcountry');
	if (country && country !== 'SG') {
		return new Response('Access restricted', { status: 403 });
	}

	// Password protection
	if (APP_PASS) {
		const authCookie = event.cookies.get('cinelog_auth');
		const isLoginPage = event.url.pathname === '/login';

		if (authCookie !== APP_PASS && !isLoginPage) {
			if (event.url.pathname.startsWith('/api') || event.url.pathname.includes('.')) {
				return new Response('Unauthorized', { status: 401 });
			}
			throw redirect(303, '/login');
		}

		if (authCookie === APP_PASS && isLoginPage) {
			throw redirect(303, '/');
		}
	}

	return resolve(event);
};