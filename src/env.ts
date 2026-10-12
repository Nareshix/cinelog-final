import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	TMDB_TOKEN: {},
	APP_USER: {},
	APP_PASS: {}
});