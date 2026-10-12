import { error } from '@sveltejs/kit';
import { TMDB_TOKEN } from '$app/env/private';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, fetch, platform }) => {
	const { id } = params;

	try {
		const res = await fetch(
			`https://api.themoviedb.org/3/person/${id}?append_to_response=combined_credits,external_ids&language=en-US`,
			{
				headers: {
					Authorization: `Bearer ${TMDB_TOKEN}`,
					accept: 'application/json'
				}
			}
		);

		if (!res.ok) throw error(res.status, 'Person not found');
		const data = await res.json();

		let isStarred = false;
		if (platform?.env?.DB) {
			const check = await platform.env.DB.prepare(
				'SELECT id FROM starred_entities WHERE id = ?'
			)
				.bind(`person_${id}`)
				.first();
			isStarred = !!check;
		}

		return { person: data, isStarred };
	} catch (err) {
		console.error(err);
		throw error(500, 'Could not fetch person details');
	}
};

export const actions: Actions = {
	toggleStar: async ({ platform, params, request }) => {
		const { id } = params;
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const image_path = (formData.get('image_path') as string) || null;
		const subtitle = (formData.get('subtitle') as string) || 'Artist';
		const isStarred = formData.get('is_starred') === 'true';

		if (!platform?.env?.DB) return { success: false };

		const entityId = `person_${id}`;
		try {
			if (isStarred) {
				await platform.env.DB.prepare('DELETE FROM starred_entities WHERE id = ?').bind(entityId).run();
			} else {
				await platform.env.DB.prepare(`
					INSERT INTO starred_entities (id, tmdb_id, type, name, image_path, subtitle)
					VALUES (?, ?, 'person', ?, ?, ?)
				`).bind(entityId, Number(id), name, image_path, subtitle).run();
			}
			return { success: true };
		} catch (e) {
			console.error(e);
			return { success: false };
		}
	}
};