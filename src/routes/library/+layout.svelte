<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { page } from '$app/state';

	let { data, children } = $props();
	const currentPath = $derived(page.url.pathname);
</script>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
	<!-- Route Navigation Tabs (Smooth horizontal scroll on mobile) -->
	<div class="flex items-center gap-1.5 border-b border-border pb-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 flex-nowrap">
		<Button
			variant={currentPath === '/library' ? 'secondary' : 'ghost'}
			size="sm"
			href="/library"
			class="shrink-0"
		>
			All ({data.logs.length})
		</Button>
		<Button
			variant={currentPath === '/library/watched' ? 'secondary' : 'ghost'}
			size="sm"
			href="/library/watched"
			class="shrink-0"
		>
			Watched ({data.stats.watched})
		</Button>
		<Button
			variant={currentPath === '/library/watchlist' ? 'secondary' : 'ghost'}
			size="sm"
			href="/library/watchlist"
			class="shrink-0"
		>
			Watchlist ({data.stats.watchlist})
		</Button>
		<Button
			variant={currentPath === '/library/liked' ? 'secondary' : 'ghost'}
			size="sm"
			href="/library/liked"
			class="shrink-0"
		>
			Liked ({data.stats.liked})
		</Button>
	</div>

	<!-- Child Route Grid Content -->
	{@render children()}
</div>