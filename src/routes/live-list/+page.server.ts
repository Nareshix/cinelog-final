import { TMDB_TOKEN } from '$app/env/private';
import { env } from 'cloudflare:workers';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ platform, fetch }) => {
	if (!env.DB) return { entities: [] };

	try {
		const res = await env.DB.prepare(
			'SELECT * FROM starred_entities ORDER BY starred_at DESC'
		).all();

		const entities = (res.results || []) as Array<{
			id: string;
			tmdb_id: number;
			type: 'person' | 'company';
			name: string;
			image_path: string | null;
			subtitle: string;
		}>;

		// Fetch all user watched titles from logs
		const watchedLogs = await env.DB.prepare(
			'SELECT tmdb_id, media_type FROM logs WHERE watched = 1'
		).all();
		const watchedSet = new Set(
			(watchedLogs.results || []).map((l: any) => `${l.media_type}_${l.tmdb_id}`)
		);

		const EXCLUDED_GENRES = new Set([10767, 10763, 10764, 99]);

		const enriched = await Promise.all(
			entities.map(async (entity) => {
				try {
					if (entity.type === 'person') {
						const pRes = await fetch(
							`https://api.themoviedb.org/3/person/${entity.tmdb_id}/combined_credits?language=en-US`,
							{ headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
						);

						if (pRes.ok) {
							const pData = await pRes.json();
							const all = [...(pData.cast || []), ...(pData.crew || [])];

							const clean = all.filter((item: any) => {
								if (!item.poster_path) return false;
								if (item.genre_ids && item.genre_ids.some((id: number) => EXCLUDED_GENRES.has(id))) return false;
								const role = (item.character || item.job || '').toLowerCase();
								if (role.startsWith('self') || role.includes('archive')) return false;
								return true;
							});

							const uniquePosters = Array.from(new Set(clean.map((c: any) => c.poster_path))).slice(0, 5);
							const uniqueTitles = Array.from(new Set(clean.map((c: any) => `${c.media_type}_${c.id}`)));

							const watchedCount = uniqueTitles.filter((key) => watchedSet.has(key)).length;
							const percentage = uniqueTitles.length > 0 ? Math.round((watchedCount / uniqueTitles.length) * 100) : 0;

							return {
								...entity,
								posters: uniquePosters,
								item_count: uniqueTitles.length,
								watched_count: watchedCount,
								percentage
							};
						}
					} else {
						// Studio
						const cRes = await fetch(
							`https://api.themoviedb.org/3/discover/movie?with_companies=${entity.tmdb_id}&without_genres=10767,10763,10764,99&sort_by=primary_release_date.desc&page=1`,
							{ headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
						);

						if (cRes.ok) {
							const cData = await cRes.json();
							const titles = cData.results || [];
							const posters = titles.slice(0, 5).map((m: any) => m.poster_path);
							const watchedCount = titles.filter((m: any) => watchedSet.has(`movie_${m.id}`)).length;
							const total = cData.total_results || 0;
							const percentage = total > 0 ? Math.round((watchedCount / total) * 100) : 0;

							return {
								...entity,
								posters,
								item_count: total,
								watched_count: watchedCount,
								percentage
							};
						}
					}
				} catch (err) {
					console.error(err);
				}
				return { ...entity, posters: [], item_count: 0, watched_count: 0, percentage: 0 };
			})
		);

		return { entities: enriched };
	} catch (e) {
		console.error(e);
		return { entities: [] };
	}
};

export const actions: Actions = {
	unstar: async ({ platform, request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!env.DB || !id) return { success: false };
		try {
			await env.DB.prepare('DELETE FROM starred_entities WHERE id = ?').bind(id).run();
			return { success: true };
		} catch (e) {
			console.error(e);
			return { success: false };
		}
	}
};