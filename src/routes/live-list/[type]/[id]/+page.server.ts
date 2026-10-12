import { error } from '@sveltejs/kit';
import { TMDB_TOKEN } from '$app/env/private';
import { env } from 'cloudflare:workers';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const { type, id } = params;

	if (type !== 'person' && type !== 'company') {
		throw error(404, 'Invalid type');
	}

	try {
		// 1. Fetch user's personal logs from SQLite
		let userLogMap = new Map<string, { watched: number; rating: number; liked: number }>();
		if (env.DB) {
			const logsRes = await env.DB.prepare(
				'SELECT tmdb_id, media_type, watched, rating, liked FROM logs'
			).all();
			(logsRes.results || []).forEach((l: any) => {
				userLogMap.set(`${l.media_type}_${l.tmdb_id}`, {
					watched: l.watched,
					rating: l.rating,
					liked: l.liked
				});
			});
		}

		const EXCLUDED_GENRES = new Set([10767, 10763, 10764, 99]);
		let entityName = '';
		let entityImage: string | null = null;
		let entitySubtitle = '';
		let titles: any[] = [];

		if (type === 'person') {
			const vaultKey = `person_detail_${id}`;
			let pData: any = null;

			// Check permanent media_vault in SQLite first
			if (env.DB) {
				const cached = await env.DB.prepare('SELECT data FROM media_vault WHERE id = ?')
					.bind(vaultKey)
					.first<{ data: string }>();
				if (cached?.data) pData = JSON.parse(cached.data);
			}

			if (!pData) {
				const pRes = await fetch(
					`https://api.themoviedb.org/3/person/${id}?append_to_response=combined_credits&language=en-US`,
					{ headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
				);
				if (!pRes.ok) throw error(pRes.status, 'Person not found');
				pData = await pRes.json();

				if (env.DB) {
					try {
						await env.DB.prepare('INSERT OR REPLACE INTO media_vault (id, data) VALUES (?, ?)')
							.bind(vaultKey, JSON.stringify(pData))
							.run();
					} catch (e) {
						console.warn('Could not save person to vault:', e);
					}
				}
			}

			entityName = pData.name;
			entityImage = pData.profile_path;
			entitySubtitle = pData.known_for_department || 'Artist';

			const all = [...(pData.combined_credits?.cast || []), ...(pData.combined_credits?.crew || [])];
			const clean = all.filter((item: any) => {
				if (!item.poster_path) return false;
				if (item.genre_ids && item.genre_ids.some((gId: number) => EXCLUDED_GENRES.has(gId))) return false;
				const role = (item.character || item.job || '').toLowerCase();
				if (role.startsWith('self') || role.includes('archive')) return false;
				return true;
			});

			const dedup = new Map<string, any>();
			clean.forEach((item) => {
				const key = `${item.media_type}_${item.id}`;
				if (!dedup.has(key)) {
					const userLog = userLogMap.get(key);
					dedup.set(key, {
						id: item.id,
						media_type: item.media_type,
						title: item.title || item.name,
						poster_path: item.poster_path,
						release_date: item.release_date || item.first_air_date || '',
						vote_average: item.vote_average || 0,
						popularity: item.popularity || 0,
						user_watched: userLog?.watched === 1 ? 1 : 0,
						user_rating: userLog?.rating || 0,
						user_liked: userLog?.liked === 1 ? 1 : 0
					});
				}
			});

			titles = Array.from(dedup.values()).sort((a, b) => b.release_date.localeCompare(a.release_date));
		} else {
			// Company / Studio (e.g. A24, Columbia, Neon)
			const vaultKey = `company_detail_${id}`;
			let studioData: any = null;

			// Check permanent media_vault in SQLite first
			if (env.DB) {
				const cached = await env.DB.prepare('SELECT data FROM media_vault WHERE id = ?')
					.bind(vaultKey)
					.first<{ data: string }>();
				if (cached?.data) studioData = JSON.parse(cached.data);
			}

			if (!studioData) {
				const headers = { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' };

				// 1. Initial 3 parallel calls: Company Info + Page 1 of Movies + Page 1 of TV
				const [cRes, mFirstRes, tvFirstRes] = await Promise.all([
					fetch(`https://api.themoviedb.org/3/company/${id}`, { headers }),
					fetch(
						`https://api.themoviedb.org/3/discover/movie?with_companies=${id}&without_genres=10767,10763,10764,99&sort_by=primary_release_date.desc&page=1`,
						{ headers }
					),
					fetch(
						`https://api.themoviedb.org/3/discover/tv?with_companies=${id}&without_genres=10767,10763,10764,99&sort_by=first_air_date.desc&page=1`,
						{ headers }
					)
				]);

				if (!cRes.ok) throw error(cRes.status, 'Company not found');
				const cData = await cRes.json();
				const mFirstData = mFirstRes.ok ? await mFirstRes.json() : { results: [], total_pages: 1 };
				const tvFirstData = tvFirstRes.ok ? await tvFirstRes.json() : { results: [], total_pages: 1 };

				let allMovies = [...(mFirstData.results || [])];
				let allTv = [...(tvFirstData.results || [])];

				// 2. DYNAMICALLY CALCULATE TOTAL REMAINING PAGES
				const moviePagesNeeded = Math.max(0, (mFirstData.total_pages || 1) - 1);
				const tvPagesNeeded = Math.max(0, (tvFirstData.total_pages || 1) - 1);
				const totalPagesNeeded = moviePagesNeeded + tvPagesNeeded;

				// Cloudflare Workers free limit: 50 subrequests. We used 3, so max 44 remaining.
				const SUBREQUEST_BUDGET = 44;

				let moviePagesToFetch = 0;
				let tvPagesToFetch = 0;

				if (totalPagesNeeded <= SUBREQUEST_BUDGET) {
					// A24, Neon, Blumhouse: FITS 100% OF EVERY PAGE IN EXISTENCE DYNAMICALLY!
					moviePagesToFetch = moviePagesNeeded;
					tvPagesToFetch = tvPagesNeeded;
				} else {
					// Gigantic studios (Columbia, Disney): Maximize the remaining budget proportionally
					moviePagesToFetch = Math.min(
						moviePagesNeeded,
						Math.round(SUBREQUEST_BUDGET * (moviePagesNeeded / totalPagesNeeded))
					);
					tvPagesToFetch = Math.min(tvPagesNeeded, SUBREQUEST_BUDGET - moviePagesToFetch);
				}

				// 3. Fire all remaining pages dynamically in parallel
				const extraRequests: Promise<any>[] = [];

				for (let p = 2; p <= 1 + moviePagesToFetch; p++) {
					extraRequests.push(
						fetch(
							`https://api.themoviedb.org/3/discover/movie?with_companies=${id}&without_genres=10767,10763,10764,99&sort_by=primary_release_date.desc&page=${p}`,
							{ headers }
						)
							.then((r) => (r.ok ? r.json() : { results: [] }))
							.then((d) => ({ type: 'movie', results: d.results || [] }))
					);
				}

				for (let p = 2; p <= 1 + tvPagesToFetch; p++) {
					extraRequests.push(
						fetch(
							`https://api.themoviedb.org/3/discover/tv?with_companies=${id}&without_genres=10767,10763,10764,99&sort_by=first_air_date.desc&page=${p}`,
							{ headers }
						)
							.then((r) => (r.ok ? r.json() : { results: [] }))
							.then((d) => ({ type: 'tv', results: d.results || [] }))
					);
				}

				const extraResults = await Promise.all(extraRequests);
				for (const item of extraResults) {
					if (item.type === 'movie') allMovies.push(...item.results);
					if (item.type === 'tv') allTv.push(...item.results);
				}

				studioData = {
					company: cData,
					movieList: allMovies,
					tvList: allTv
				};

				// 4. Save entire catalogue permanently in SQLite
				if (env.DB) {
					try {
						await env.DB.prepare('INSERT OR REPLACE INTO media_vault (id, data) VALUES (?, ?)')
							.bind(vaultKey, JSON.stringify(studioData))
							.run();
					} catch (e) {
						console.warn('Could not save company to vault:', e);
					}
				}
			}

			entityName = studioData.company.name;
			entityImage = studioData.company.logo_path;
			entitySubtitle = studioData.company.origin_country || 'Studio';

			const movieTitles = (studioData.movieList || []).map((m: any) => {
				const key = `movie_${m.id}`;
				const userLog = userLogMap.get(key);
				return {
					id: m.id,
					media_type: 'movie',
					title: m.title,
					poster_path: m.poster_path,
					release_date: m.release_date || '',
					vote_average: m.vote_average || 0,
					popularity: m.popularity || 0,
					user_watched: userLog?.watched === 1 ? 1 : 0,
					user_rating: userLog?.rating || 0,
					user_liked: userLog?.liked === 1 ? 1 : 0
				};
			});

			const tvTitles = (studioData.tvList || []).map((t: any) => {
				const key = `tv_${t.id}`;
				const userLog = userLogMap.get(key);
				return {
					id: t.id,
					media_type: 'tv',
					title: t.name,
					poster_path: t.poster_path,
					release_date: t.first_air_date || '',
					vote_average: t.vote_average || 0,
					popularity: t.popularity || 0,
					user_watched: userLog?.watched === 1 ? 1 : 0,
					user_rating: userLog?.rating || 0,
					user_liked: userLog?.liked === 1 ? 1 : 0
				};
			});

			// Deduplicate and merge movies & TV
			const dedup = new Map<string, any>();
			[...movieTitles, ...tvTitles].forEach((t) => {
				const k = `${t.media_type}_${t.id}`;
				if (!dedup.has(k)) dedup.set(k, t);
			});

			titles = Array.from(dedup.values()).sort((a, b) =>
				(b.release_date || '').localeCompare(a.release_date || '')
			);
		}

		const watchedCount = titles.filter((t) => t.user_watched === 1).length;
		const percentage = titles.length > 0 ? Math.round((watchedCount / titles.length) * 100) : 0;

		return {
			entity: { id, type, name: entityName, image: entityImage, subtitle: entitySubtitle },
			titles,
			watchedCount,
			totalCount: titles.length,
			percentage
		};
	} catch (err) {
		console.error('Error loading live list:', err);
		throw error(500, 'Could not load live tracker');
	}
};

export const actions = {
	sync: async ({ params }) => {
		const { type, id } = params;
		const vaultKey = type === 'person' ? `person_detail_${id}` : `company_detail_${id}`;

		if (env.DB) {
			// Wipe the single vault entry for this entity so the load function refetches fresh data
			await env.DB.prepare('DELETE FROM media_vault WHERE id = ?').bind(vaultKey).run();
		}

		return { success: true };
	}
};