import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return { logs: [], stats: { watched: 0, watchlist: 0, liked: 0, avgRating: '0.0' } };
	}

	try {
		const result = await platform.env.DB.prepare(
			'SELECT * FROM logs ORDER BY updated_at DESC'
		).all();

		const logs = (result.results || []) as Array<{
			id: string;
			tmdb_id: number;
			media_type: 'movie' | 'tv';
			title: string;
			poster_path: string | null;
			watched: number;
			liked: number;
			watchlist: number;
			rating: number;
			notes: string;
			updated_at: string;
		}>;

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
		console.error('Error in library layout load:', err);
		return { logs: [], stats: { watched: 0, watchlist: 0, liked: 0, avgRating: '0.0' } };
	}
};