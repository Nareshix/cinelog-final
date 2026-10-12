import { json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return json({
		hasEnv: !!env,
		hasDB: !!env?.DB,
		keys: env ? Object.keys(env) : []
	});
};