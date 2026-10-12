import { dev } from '$app/env';
import { APP_PASS } from '$app/env/private';
import { redirect, type Handle } from '@sveltejs/kit';

let platformProxy: any;

if (dev) {
	try {
		const { getPlatformProxy } = await import('wrangler');
		platformProxy = await getPlatformProxy({
			configPath: 'wrangler.jsonc',
			persist: true
		});
	} catch (e) {
		console.error('❌ Failed to initialize Wrangler platform proxy:', e);
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// 1. BLOCK ALL TRAFFIC OUTSIDE SINGAPORE
	const country = event.request.headers.get('cf-ipcountry');
	if (country && country !== 'SG') {
		return new Response('Access denied', { status: 403 });
	}

	// 2. STOP BOTS FROM DOUBLE-DIPPING (NO 303 REDIRECT FOR PROBES)
	if (APP_PASS) {
		const authCookie = event.cookies.get('cinelog_auth');
		const isLoginPage = event.url.pathname === '/login';

		// If a bot hits an API or random asset without auth, cut them off with 401 instead of redirecting
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

	// 3. Attach local Wrangler proxy for D1
	if (platformProxy) {
		event.platform = {
			...event.platform,
			...platformProxy,
			env: {
				...event.platform?.env,
				...platformProxy.env
			}
		};
	}

	return resolve(event);
};