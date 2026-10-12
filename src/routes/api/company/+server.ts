import { json } from '@sveltejs/kit';
import { TMDB_TOKEN } from '$app/env/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const id = url.searchParams.get('id');
	const page = url.searchParams.get('page') || '1';
	const media = url.searchParams.get('media') || 'movie';
	const sort = url.searchParams.get('sort') || 'popularity.desc';

	if (!id) {
		return json({ titles: [], totalPages: 1, totalResults: 0 });
	}

	try {
const res = await fetch(
	`https://api.themoviedb.org/3/discover/${media}?with_companies=${id}&without_genres=10767,10763,10764,99&sort_by=${sort}&page=${page}`,
	{
		headers: {
			Authorization: `Bearer ${TMDB_TOKEN}`,
			accept: 'application/json'
		}
	}
);

		if (!res.ok) {
			return json({ titles: [], totalPages: 1, totalResults: 0 });
		}

		const data = await res.json();
		const titles = (data.results || []).map((t: any) => ({
			...t,
			media_type: media
		}));

		return json({
			titles,
			totalPages: Math.min(data.total_pages || 1, 500),
			totalResults: data.total_results || 0
		});
	} catch (err) {
		console.error('Error fetching company titles:', err);
		return json({ titles: [], totalPages: 1, totalResults: 0 });
	}
};