import { json } from '@sveltejs/kit';
import { TMDB_TOKEN } from '$app/env/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const query = url.searchParams.get('q');

	if (!query || query.trim() === '') {
		return json({ results: [] });
	}

	if (!TMDB_TOKEN) {
		console.error('TMDB_TOKEN is missing! Make sure it is defined in .env');
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	try {
		// Search movies, TV, people AND companies simultaneously
		const [multiRes, companyRes] = await Promise.all([
			fetch(
				`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
					query
				)}&include_adult=false&language=en-US&page=1`,
				{
					headers: {
						Authorization: `Bearer ${TMDB_TOKEN}`,
						accept: 'application/json'
					}
				}
			),
			fetch(
				`https://api.themoviedb.org/3/search/company?query=${encodeURIComponent(
					query
				)}&page=1`,
				{
					headers: {
						Authorization: `Bearer ${TMDB_TOKEN}`,
						accept: 'application/json'
					}
				}
			)
		]);

		const multiData = multiRes.ok ? await multiRes.json() : { results: [] };
		const companyData = companyRes.ok ? await companyRes.json() : { results: [] };

		// Tag company results
		const companies = (companyData.results || []).slice(0, 4).map((c: any) => ({
			id: c.id,
			name: c.name,
			logo_path: c.logo_path,
			origin_country: c.origin_country,
			media_type: 'company'
		}));

		// Filter multi search to keep movies, tv, and people
		const multiResults = (multiData.results || []).filter(
			(item: any) =>
				item.media_type === 'movie' ||
				item.media_type === 'tv' ||
				item.media_type === 'person'
		);

		return json({ results: [...multiResults, ...companies] });
	} catch (err) {
		console.error('TMDB Search Error:', err);
		return json({ results: [] }, { status: 500 });
	}
};