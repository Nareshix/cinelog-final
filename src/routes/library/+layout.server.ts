import { env } from 'cloudflare:workers';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	if (!env.DB) {
		return { logs: [], stats: { watched: 0, watchlist: 0, liked: 0, avgRating: '0.0' } };
	}

	try {
		const result = await env.DB.prepare(
			'SELECT * FROM logs ORDER BY updated_at DESC'
		).all();

		const logs = (result.results || []) as any[];

		const watchedCount = logs.filter((l) => l.watched === 1).length;
		const watchlistCount = logs.filter((l) => l.watchlist === 1).length;
		const likedCount = logs.filter((l) => l.liked === 1).length;
		const ratedLogs = logs.filter((l) => l.rating > 0);
		const avgRating =
			ratedLogs.length > 0
				? (ratedLogs.reduce((acc, curr) => acc + curr.rating, 0) / ratedLogs.length).toFixed(1)
				: '0.0';

		return {
			logs,
			stats: {
				watched: watchedCount,
				watchlist: watchlistCount,
				liked: likedCount,
				avgRating
			}
		};
	} catch (err) {
		console.error('Error loading library:', err);
		return { logs: [], stats: { watched: 0, watchlist: 0, liked: 0, avgRating: '0.0' } };
	}
};