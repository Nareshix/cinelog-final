import { error } from '@sveltejs/kit';
import { TMDB_TOKEN } from '$app/env/private';
import { env } from 'cloudflare:workers';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const { type, id } = params;

	if (type !== 'movie' && type !== 'tv') {
		throw error(404, 'Invalid media type');
	}

	try {
		const res = await fetch(
			`https://api.themoviedb.org/3/${type}/${id}?append_to_response=credits,recommendations,external_ids&language=en-US`,
			{
				headers: {
					Authorization: `Bearer ${TMDB_TOKEN}`,
					accept: 'application/json'
				}
			}
		);

		if (!res.ok) {
			throw error(res.status, 'Title not found on TMDB');
		}

		const data = await res.json();
		const logId = `${type}_${id}`;
		let userLog = null;
		let userLists: Array<{ id: string; name: string; inList: boolean }> = [];

		if (env.DB) {
			userLog = await env.DB.prepare('SELECT * FROM logs WHERE id = ?')
				.bind(logId)
				.first();

			try {
				const listsRes = await env.DB.prepare(`
					SELECT l.id, l.name,
						CASE WHEN li.tmdb_id IS NOT NULL THEN 1 ELSE 0 END as in_list
					FROM lists l
					LEFT JOIN list_items li
						ON l.id = li.list_id AND li.tmdb_id = ? AND li.media_type = ?
					ORDER BY l.name ASC
				`)
					.bind(Number(id), type)
					.all();

				userLists = (listsRes.results || []).map((row: any) => ({
					id: row.id,
					name: row.name,
					inList: row.in_list === 1
				}));
			} catch (dbErr) {
				console.warn('⚠️ lists tables not yet initialized:', dbErr);
			}
		}

		return {
			item: data,
			type,
			userLog,
			userLists
		};
	} catch (err) {
		console.error('Error in load:', err);
		throw error(500, 'Could not fetch title details');
	}
};

export const actions: Actions = {
	saveLog: async ({ request, params }) => {
		const { type, id } = params;
		const logId = `${type}_${id}`;
		const formData = await request.formData();

		if (!env.DB) return { success: false, error: 'Database unavailable' };

		const title = formData.get('title') as string;
		const poster_path = (formData.get('poster_path') as string) || null;
		const watched = formData.get('watched') === 'true' ? 1 : 0;
		const liked = formData.get('liked') === 'true' ? 1 : 0;
		const watchlist = formData.get('watchlist') === 'true' ? 1 : 0;
		const rating = parseFloat(formData.get('rating') as string) || 0;
		const notes = (formData.get('notes') as string) || '';
		const vote_average = parseFloat(formData.get('vote_average') as string) || 0;
		const popularity = parseFloat(formData.get('popularity') as string) || 0;

		try {
			await env.DB.prepare(`
				INSERT INTO logs (id, tmdb_id, media_type, title, poster_path, watched, liked, watchlist, rating, notes, vote_average, popularity, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
				ON CONFLICT(id) DO UPDATE SET
					watched = excluded.watched,
					liked = excluded.liked,
					watchlist = excluded.watchlist,
					rating = excluded.rating,
					notes = excluded.notes,
					vote_average = excluded.vote_average,
					popularity = excluded.popularity,
					updated_at = CURRENT_TIMESTAMP
			`)
				.bind(
					logId,
					Number(id),
					type,
					title,
					poster_path,
					watched,
					liked,
					watchlist,
					rating,
					notes,
					vote_average,
					popularity
				)
				.run();

			return { success: true };
		} catch (dbErr: any) {
			console.error('❌ SQL Execution Error in saveLog:', dbErr);
			return { success: false, error: dbErr?.message || String(dbErr) };
		}
	},

	toggleListItem: async ({ request, params }) => {
		const { type, id } = params;
		const formData = await request.formData();
		const listId = formData.get('list_id') as string;
		const title = formData.get('title') as string;
		const poster_path = (formData.get('poster_path') as string) || null;
		const inList = formData.get('in_list') === 'true';

		if (!env.DB || !listId) return { success: false };

		try {
			if (inList) {
				await env.DB.prepare(
					'DELETE FROM list_items WHERE list_id = ? AND tmdb_id = ? AND media_type = ?'
				)
					.bind(listId, Number(id), type)
					.run();
			} else {
				await env.DB.prepare(`
					INSERT INTO list_items (list_id, tmdb_id, media_type, title, poster_path)
					VALUES (?, ?, ?, ?, ?)
					ON CONFLICT(list_id, tmdb_id, media_type) DO NOTHING
				`)
					.bind(listId, Number(id), type, title, poster_path)
					.run();
			}
			return { success: true };
		} catch (err) {
			console.error('❌ Failed to toggle list item:', err);
			return { success: false };
		}
	},

	createListAndAdd: async ({ request, params }) => {
		const { type, id } = params;
		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const title = formData.get('title') as string;
		const poster_path = (formData.get('poster_path') as string) || null;

		if (!env.DB || !name) return { success: false };

		const listId = crypto.randomUUID();

		try {
			await env.DB.prepare('INSERT INTO lists (id, name) VALUES (?, ?)')
				.bind(listId, name)
				.run();

			await env.DB.prepare(`
				INSERT INTO list_items (list_id, tmdb_id, media_type, title, poster_path)
				VALUES (?, ?, ?, ?, ?)
				ON CONFLICT(list_id, tmdb_id, media_type) DO NOTHING
			`)
				.bind(listId, Number(id), type, title, poster_path)
				.run();

			return { success: true };
		} catch (err) {
			console.error('❌ Failed to create list and add item:', err);
			return { success: false };
		}
	}
};