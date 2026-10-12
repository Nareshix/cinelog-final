import { TMDB_TOKEN } from '$app/env/private';
import { env } from 'cloudflare:workers';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
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
						const cacheKey = `person_credits_${entity.tmdb_id}`;
						let pData: any = null;

						// 1. Check permanent media_vault in SQLite D1
						const cached = await env.DB.prepare('SELECT data FROM media_vault WHERE id = ?')
							.bind(cacheKey)
							.first<{ data: string }>();

						if (cached?.data) {
							pData = JSON.parse(cached.data);
						} else {
							// 2. First time ever: Fetch from TMDB once, then save to media_vault
							const r = await fetch(
								`https://api.themoviedb.org/3/person/${entity.tmdb_id}/combined_credits?language=en-US`,
								{ headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
							);
							pData = r.ok ? await r.json() : { cast: [], crew: [] };

							try {
								await env.DB.prepare('INSERT OR REPLACE INTO media_vault (id, data) VALUES (?, ?)')
									.bind(cacheKey, JSON.stringify(pData))
									.run();
							} catch (e) {
								console.warn('Could not save person to media_vault:', e);
							}
						}

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
					} else {
						const cacheKey = `company_catalogue_${entity.tmdb_id}`;
						let catalogue: any = null;

						// 1. Check permanent media_vault in SQLite D1
						const cached = await env.DB.prepare('SELECT data FROM media_vault WHERE id = ?')
							.bind(cacheKey)
							.first<{ data: string }>();

						if (cached?.data) {
							catalogue = JSON.parse(cached.data);
						} else {
							// 2. First time ever: Fetch both movies & TV from TMDB, then save to media_vault
							const [mRes, tvRes] = await Promise.all([
								fetch(
									`https://api.themoviedb.org/3/discover/movie?with_companies=${entity.tmdb_id}&without_genres=10767,10763,10764,99&sort_by=primary_release_date.desc&page=1`,
									{ headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
								),
								fetch(
									`https://api.themoviedb.org/3/discover/tv?with_companies=${entity.tmdb_id}&without_genres=10767,10763,10764,99&sort_by=first_air_date.desc&page=1`,
									{ headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
								)
							]);

							const mData = mRes.ok ? await mRes.json() : { results: [], total_results: 0 };
							const tvData = tvRes.ok ? await tvRes.json() : { results: [], total_results: 0 };

							const titles = [
								...(mData.results || []).map((m: any) => ({ ...m, media_type: 'movie', date: m.release_date })),
								...(tvData.results || []).map((t: any) => ({ ...t, media_type: 'tv', date: t.first_air_date }))
							].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

							catalogue = {
								titles,
								total: (mData.total_results || 0) + (tvData.total_results || 0)
							};

							try {
								await env.DB.prepare('INSERT OR REPLACE INTO media_vault (id, data) VALUES (?, ?)')
									.bind(cacheKey, JSON.stringify(catalogue))
									.run();
							} catch (e) {
								console.warn('Could not save company to media_vault:', e);
							}
						}

						const posters = (catalogue.titles || []).slice(0, 5).map((x: any) => x.poster_path);
						const watchedCount = (catalogue.titles || []).filter((x: any) => watchedSet.has(`${x.media_type}_${x.id}`)).length;
						const total = catalogue.total || 0;
						const percentage = total > 0 ? Math.round((watchedCount / total) * 100) : 0;

						return {
							...entity,
							posters,
							item_count: total,
							watched_count: watchedCount,
							percentage
						};
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
	unstar: async ({ request }) => {
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