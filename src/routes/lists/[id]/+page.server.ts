import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const { id } = params;

	if (!env.DB) {
		throw error(500, 'Database not available');
	}

	try {
		const list = await env.DB.prepare('SELECT * FROM lists WHERE id = ?')
			.bind(id)
			.first();

		if (!list) throw error(404, 'List not found');

		// Cross-reference with user logs to fetch watched status, personal ratings, hearts, and TMDB metrics
		const itemsRes = await env.DB.prepare(`
			SELECT li.*,
				CASE WHEN l.watched = 1 THEN 1 ELSE 0 END as user_watched,
				l.rating as user_rating,
				CASE WHEN l.liked = 1 THEN 1 ELSE 0 END as user_liked,
				l.vote_average,
				l.popularity
			FROM list_items li
			LEFT JOIN logs l ON l.tmdb_id = li.tmdb_id AND l.media_type = li.media_type
			WHERE li.list_id = ?
			ORDER BY li.added_at DESC
		`)
			.bind(id)
			.all();

		const items = itemsRes.results || [];
		const watchedCount = items.filter((i: any) => i.user_watched === 1).length;
		const percentage = items.length > 0 ? Math.round((watchedCount / items.length) * 100) : 0;

		return {
			list,
			items,
			watchedCount,
			percentage
		};
	} catch (err) {
		console.error('Error loading list:', err);
		throw error(500, 'Could not load list');
	}
};

export const actions: Actions = {
	updateList: async ({ request, platform, params }) => {
		const { id } = params;
		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const description = (formData.get('description') as string)?.trim() || '';

		if (!env.DB || !name) return { success: false };

		try {
			await env.DB.prepare('UPDATE lists SET name = ?, description = ? WHERE id = ?')
				.bind(name, description, id)
				.run();
			return { success: true };
		} catch (err) {
			console.error(err);
			return { success: false };
		}
	},

	addItem: async ({ request, platform, params }) => {
		const { id } = params;
		const formData = await request.formData();
		const tmdb_id = Number(formData.get('tmdb_id'));
		const media_type = formData.get('media_type') as string;
		const title = formData.get('title') as string;
		const poster_path = (formData.get('poster_path') as string) || null;

		if (!env.DB || !tmdb_id) return { success: false };

		try {
			await env.DB.prepare(`
				INSERT INTO list_items (list_id, tmdb_id, media_type, title, poster_path)
				VALUES (?, ?, ?, ?, ?)
				ON CONFLICT(list_id, tmdb_id, media_type) DO NOTHING
			`)
				.bind(id, tmdb_id, media_type, title, poster_path)
				.run();
			return { success: true };
		} catch (err) {
			console.error(err);
			return { success: false };
		}
	},

	removeItem: async ({ request, platform, params }) => {
		const { id } = params;
		const formData = await request.formData();
		const tmdb_id = Number(formData.get('tmdb_id'));
		const media_type = formData.get('media_type') as string;

		if (!env.DB || !tmdb_id) return { success: false };

		try {
			await env.DB.prepare('DELETE FROM list_items WHERE list_id = ? AND tmdb_id = ? AND media_type = ?')
				.bind(id, tmdb_id, media_type)
				.run();
			return { success: true };
		} catch (err) {
			console.error(err);
			return { success: false };
		}
	}
};