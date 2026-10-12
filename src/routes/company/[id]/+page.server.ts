import { error } from '@sveltejs/kit';
import { TMDB_TOKEN } from '$app/env/private';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, fetch, platform }) => {
	const { id } = params;

	try {
		const companyRes = await fetch(`https://api.themoviedb.org/3/company/${id}`, {
			headers: {
				Authorization: `Bearer ${TMDB_TOKEN}`,
				accept: 'application/json'
			}
		});

		if (!companyRes.ok) throw error(companyRes.status, 'Company not found');
		const company = await companyRes.json();

		const discoverRes = await fetch(
			`https://api.themoviedb.org/3/discover/movie?with_companies=${id}&without_genres=10767,10763,10764,99&sort_by=primary_release_date.desc&page=1`,
			{
				headers: {
					Authorization: `Bearer ${TMDB_TOKEN}`,
					accept: 'application/json'
				}
			}
		);

		const discoverData = discoverRes.ok ? await discoverRes.json() : { results: [], total_pages: 1, total_results: 0 };
		const initialTitles = (discoverData.results || []).map((t: any) => ({ ...t, media_type: 'movie' }));

		let isStarred = false;
		if (platform?.env?.DB) {
			const check = await platform.env.DB.prepare('SELECT id FROM starred_entities WHERE id = ?').bind(`company_${id}`).first();
			isStarred = !!check;
		}

		return {
			company,
			initialTitles,
			initialTotalPages: Math.min(discoverData.total_pages || 1, 500),
			initialTotalResults: discoverData.total_results || 0,
			isStarred
		};
	} catch (err) {
		console.error(err);
		throw error(500, 'Could not load company');
	}
};

export const actions: Actions = {
	toggleStar: async ({ platform, params, request }) => {
		const { id } = params;
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const image_path = (formData.get('image_path') as string) || null;
		const subtitle = (formData.get('subtitle') as string) || 'Production Studio';
		const isStarred = formData.get('is_starred') === 'true';

		if (!platform?.env?.DB) return { success: false };

		const entityId = `company_${id}`;
		try {
			if (isStarred) {
				await platform.env.DB.prepare('DELETE FROM starred_entities WHERE id = ?').bind(entityId).run();
			} else {
				await platform.env.DB.prepare(`
					INSERT INTO starred_entities (id, tmdb_id, type, name, image_path, subtitle)
					VALUES (?, ?, 'company', ?, ?, ?)
				`).bind(entityId, Number(id), name, image_path, subtitle).run();
			}
			return { success: true };
		} catch (e) {
			console.error(e);
			return { success: false };
		}
	}
};