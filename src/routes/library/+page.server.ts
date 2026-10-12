import type { Actions } from './$types';
import { env } from 'cloudflare:workers';

export const actions: Actions = {
	deleteLog: async ({ request, platform }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!env.DB || !id) return { success: false };

		try {
			await env.DB.prepare('DELETE FROM logs WHERE id = ?').bind(id).run();
			return { success: true };
		} catch (err) {
			console.error('Failed to delete log:', err);
			return { success: false };
		}
	}
};