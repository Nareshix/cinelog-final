<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Star, ChevronLeft, Building2, User, Heart, ChevronDown } from 'lucide-svelte';

	let { data } = $props();
	const entity = $derived(data.entity);
	const titles = $derived(data.titles);

	type ViewTab = 'all' | 'watched' | 'unwatched';
	let activeTab = $state<ViewTab>('all');
	let likedOnly = $state(false);

	type SortOption = 'recent' | 'rating-desc' | 'rating-asc' | 'community-desc' | 'popularity-desc' | 'title';
	let sortBy = $state<SortOption>('recent');

	const displayedTitles = $derived.by(() => {
		let list = [...titles];

		// Watched/Unwatched tab
		if (activeTab === 'watched') list = list.filter((t: any) => t.user_watched === 1);
		if (activeTab === 'unwatched') list = list.filter((t: any) => t.user_watched === 0);

		// Liked filter
		if (likedOnly) list = list.filter((t: any) => t.user_liked === 1);

		// Comprehensive Sorting
		if (sortBy === 'rating-desc') {
			list.sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0));
		} else if (sortBy === 'rating-asc') {
			list.sort((a, b) => (a.user_rating || 0) - (b.user_rating || 0));
		} else if (sortBy === 'community-desc') {
			list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
		} else if (sortBy === 'popularity-desc') {
			list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
		} else if (sortBy === 'title') {
			list.sort((a, b) => a.title.localeCompare(b.title));
		} else {
			// 'recent'
			list.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
		}

		return list;
	});
</script>

<div class="max-w-6xl mx-auto px-6 py-8 space-y-8">
	<!-- Header Navigation & Live Progress Bar -->
	<div class="space-y-5 border-b border-border pb-6">
		<Button variant="ghost" size="xs" href="/live-list" class="gap-1 text-muted-foreground">
			<ChevronLeft class="w-3.5 h-3.5" />
			Back to Live Lists
		</Button>

		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
			<!-- Artist/Studio Info -->
			<div class="flex items-center gap-4">
				<div class="w-14 h-14 rounded-full overflow-hidden bg-muted shrink-0 border border-border/60 flex items-center justify-center">
					{#if entity.image}
						<img
							src={`https://image.tmdb.org/t/p/w185${entity.image}`}
							alt={entity.name}
							class="w-full h-full object-cover {entity.type === 'company' ? 'object-contain p-2 filter brightness-90' : ''}"
						/>
					{:else if entity.type === 'company'}
						<Building2 class="w-7 h-7 text-muted-foreground/60" />
					{:else}
						<User class="w-7 h-7 text-muted-foreground/60" />
					{/if}
				</div>

				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{entity.name}</h1>
						<Badge variant="outline" class="text-[10px] uppercase font-semibold">
							{entity.subtitle}
						</Badge>
					</div>
					<p class="text-xs text-muted-foreground">
						Live Catalogue Tracker • {data.totalCount} titles
					</p>
				</div>
			</div>

			<!-- Live Progress Tracker Bar -->
			<div class="w-full sm:w-72 space-y-2 p-3 rounded-xl bg-card border border-border">
				<div class="flex items-center justify-between text-xs font-medium">
					<span class="text-muted-foreground">
						Watched <span class="text-foreground font-semibold">{data.watchedCount}</span> of {data.totalCount}
					</span>
					<span class="text-primary font-bold">{data.percentage}%</span>
				</div>
				<div class="w-full bg-muted/60 rounded-full h-2 overflow-hidden border border-border/40">
					<div
						class="bg-primary h-full rounded-full transition-all duration-500 ease-out"
						style="width: {data.percentage}%"
					></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Controls: Tabs on the left, Liked + Sort on the right -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
		<!-- Left: View Tabs -->
		<div class="flex items-center gap-1.5 flex-wrap">
			<Button
				variant={activeTab === 'all' ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (activeTab = 'all')}
			>
				All ({data.totalCount})
			</Button>
			<Button
				variant={activeTab === 'watched' ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (activeTab = 'watched')}
			>
				Watched ({data.watchedCount})
			</Button>
			<Button
				variant={activeTab === 'unwatched' ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (activeTab = 'unwatched')}
			>
				Unwatched ({data.totalCount - data.watchedCount})
			</Button>
		</div>

		<!-- Right: Liked Button beside Sort Dropdown -->
		<div class="flex items-center gap-2.5 self-end sm:self-auto">
			<Button
				variant={likedOnly ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (likedOnly = !likedOnly)}
				class="gap-1.5 text-xs cursor-pointer {likedOnly ? 'border border-rose-500/30' : ''}"
			>
				<Heart class="w-3.5 h-3.5 {likedOnly ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}" />
				Liked
			</Button>

			<div class="flex items-center gap-1.5">
				<span class="text-xs text-muted-foreground font-medium">Sort:</span>
				<div class="relative inline-flex items-center">
					<select
						bind:value={sortBy}
						class="appearance-none bg-card border border-input rounded-md pl-3 pr-8 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
					>
						<option value="recent">Recently Released</option>
						<option value="rating-desc">My Rating: High to Low</option>
						<option value="rating-asc">My Rating: Low to High</option>
						<option value="community-desc">Highest Community Rating</option>
						<option value="popularity-desc">Most Popular</option>
						<option value="title">Alphabetical (A-Z)</option>
					</select>
					<ChevronDown class="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
				</div>
			</div>
		</div>
	</div>

	<!-- Clean Grid of Movies in Live List -->
	{#if displayedTitles.length > 0}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
			{#each displayedTitles as item (item.media_type + '_' + item.id)}
				<a href={`/title/${item.media_type}/${item.id}`} class="block h-full group">
					<Card.Root class="overflow-hidden transition hover:border-foreground/30 flex flex-col h-full bg-card border-border pt-0 gap-0">
						<!-- Clean Poster -->
						<div class="relative aspect-2/3 bg-muted w-full overflow-hidden">
							{#if item.poster_path}
								<img
									src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
									alt={item.title}
									class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
									loading="lazy"
								/>
							{:else}
								<div class="flex items-center justify-center h-full text-xs text-muted-foreground p-2 text-center">
									No Poster
								</div>
							{/if}
						</div>

						<!-- Card Info below poster (Rating first, then Heart) -->
						<Card.Content class="p-3 flex-1 flex flex-col justify-between space-y-2">
							<h3 class="font-semibold text-sm line-clamp-1 group-hover:underline text-foreground" title={item.title}>
								{item.title}
							</h3>

							<div class="flex items-center justify-between text-xs pt-1">
								<div class="flex items-center gap-1.5">
									<Badge variant="outline" class="text-[10px] uppercase font-medium">
										{item.media_type === 'movie' ? 'Film' : 'TV'}
									</Badge>
									{#if item.user_watched === 1}
										<Badge variant="outline" class="text-[10px] text-emerald-500 border-emerald-500/30">
											Watched
										</Badge>
									{/if}
								</div>

								<!-- Rating first, then Heart after rating -->
								<div class="flex items-center gap-1.5 shrink-0">
									{#if item.user_rating > 0}
										<span class="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
											★ {item.user_rating}
										</span>
									{/if}
									{#if item.user_liked === 1}
										<Heart class="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
									{/if}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		</div>
	{:else}
		<div class="text-center py-20 text-muted-foreground text-sm">
			No titles found for this filter.
		</div>
	{/if}
</div>