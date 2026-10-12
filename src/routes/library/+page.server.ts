import type { Actions } from './$types';

export const actions: Actions = {
	deleteLog: async ({ request, platform }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!platform?.env?.DB || !id) return { success: false };

		try {
			await platform.env.DB.prepare('DELETE FROM logs WHERE id = ?').bind(id).run();
			return { success: true };
		} catch (err) {
			console.error('Failed to delete log:', err);
			return { success: false };
		}
	}
};