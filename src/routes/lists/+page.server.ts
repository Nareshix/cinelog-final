import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) return { lists: [] };

	try {
		const listsRes = await platform.env.DB.prepare(`
			SELECT l.id, l.name, l.description, l.created_at,
				COUNT(li.tmdb_id) as item_count
			FROM lists l
			LEFT JOIN list_items li ON l.id = li.list_id
			GROUP BY l.id
			ORDER BY l.created_at DESC
		`).all();

		const lists = listsRes.results || [];

		// Fetch up to 7 posters to enable smooth left-slide peek
		const enrichedLists = await Promise.all(
			lists.map(async (list: any) => {
				const postersRes = await platform.env!.DB.prepare(`
					SELECT poster_path FROM list_items
					WHERE list_id = ? AND poster_path IS NOT NULL
					ORDER BY added_at DESC
					LIMIT 7
				`)
					.bind(list.id)
					.all();

				return {
					...list,
					posters: (postersRes.results || []).map((p: any) => p.poster_path)
				};
			})
		);

		return { lists: enrichedLists };
	} catch (err) {
		console.error('Error fetching lists:', err);
		return { lists: [] };
	}
};

export const actions: Actions = {
	createList: async ({ request, platform }) => {
		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const description = (formData.get('description') as string)?.trim() || '';

		if (!platform?.env?.DB || !name) return { success: false };

		const listId = crypto.randomUUID();

		try {
			await platform.env.DB.prepare('INSERT INTO lists (id, name, description) VALUES (?, ?, ?)')
				.bind(listId, name, description)
				.run();
			return { success: true };
		} catch (err) {
			console.error(err);
			return { success: false };
		}
	},

	deleteList: async ({ request, platform }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!platform?.env?.DB || !id) return { success: false };

		try {
			await platform.env.DB.prepare('DELETE FROM lists WHERE id = ?').bind(id).run();
			return { success: true };
		} catch (err) {
			console.error(err);
			return { success: false };
		}
	}
};