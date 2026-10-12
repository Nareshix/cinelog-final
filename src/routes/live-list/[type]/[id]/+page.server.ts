import { error } from '@sveltejs/kit';
import { TMDB_TOKEN } from '$app/env/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, platform }) => {
	const { type, id } = params;

	if (type !== 'person' && type !== 'company') {
		throw error(404, 'Invalid type');
	}

	try {
		// 1. Fetch user's watched status, personal ratings, and liked hearts from SQLite
		let userLogMap = new Map<string, { watched: number; rating: number; liked: number }>();
		if (platform?.env?.DB) {
			const logsRes = await platform.env.DB.prepare(
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
			const pRes = await fetch(
				`https://api.themoviedb.org/3/person/${id}?append_to_response=combined_credits&language=en-US`,
				{ headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
			);
			if (!pRes.ok) throw error(404, 'Person not found');
			const pData = await pRes.json();

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
			// Company
			const cRes = await fetch(`https://api.themoviedb.org/3/company/${id}`, {
				headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' }
			});
			if (!cRes.ok) throw error(404, 'Company not found');
			const cData = await cRes.json();

			entityName = cData.name;
			entityImage = cData.logo_path;
			entitySubtitle = cData.origin_country || 'Studio';

			const discRes = await fetch(
				`https://api.themoviedb.org/3/discover/movie?with_companies=${id}&without_genres=10767,10763,10764,99&sort_by=primary_release_date.desc&page=1`,
				{ headers: { Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } }
			);
			const discData = discRes.ok ? await discRes.json() : { results: [] };

			titles = (discData.results || []).map((m: any) => {
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