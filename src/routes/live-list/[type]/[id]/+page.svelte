<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import {
		Star,
		ChevronLeft,
		Building2,
		User,
		Heart,
		ChevronDown,
		RotateCw
	} from 'lucide-svelte';

	let { data } = $props();
	const entity = $derived(data.entity);
	const titles = $derived(data.titles);

	type ViewTab = 'all' | 'watched' | 'unwatched';
	let activeTab = $state<ViewTab>('all');
	let showUnreleased = $state(false); // OFF by default
	let likedOnly = $state(false);
	let isSyncing = $state(false);

	type SortOption =
		| 'recent'
		| 'rating-desc'
		| 'rating-asc'
		| 'community-desc'
		| 'popularity-desc'
		| 'title';
	let sortBy = $state<SortOption>('recent');

	const today = new Date().toISOString().split('T')[0];

	function isUnreleased(item: any): boolean {
		const date = item.release_date;
		if (!date || date.trim() === '') return true;
		return date > today;
	}

	// Filter released vs unreleased
	const releasedTitles = $derived(titles.filter((t: any) => !isUnreleased(t)));
	const unreleasedCount = $derived(titles.filter((t: any) => isUnreleased(t)).length);

	// Tracking calculations: STRICTLY OUT OF RELEASED TITLES ONLY
	const watchedCount = $derived(titles.filter((t: any) => t.user_watched === 1).length);
	const releasedCount = $derived(releasedTitles.length);
	const completionPercentage = $derived(
		releasedCount > 0 ? Math.round((watchedCount / releasedCount) * 100) : 0
	);

	// Displayed pool depends on whether "Show Unreleased" is toggled
	const pool = $derived(showUnreleased ? titles : releasedTitles);

	const displayedTitles = $derived.by(() => {
		let list = [...pool];

		// Tab filter
		if (activeTab === 'watched') list = list.filter((t: any) => t.user_watched === 1);
		if (activeTab === 'unwatched') list = list.filter((t: any) => t.user_watched === 0);

		// Liked filter
		if (likedOnly) list = list.filter((t: any) => t.user_liked === 1);

		// Sorting
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
				<div
					class="w-14 h-14 rounded-full overflow-hidden bg-muted shrink-0 border border-border/60 flex items-center justify-center"
				>
					{#if entity.image}
						<img
							src={`https://image.tmdb.org/t/p/w185${entity.image}`}
							alt={entity.name}
							class="w-full h-full object-cover {entity.type === 'company'
								? 'object-contain p-2 filter brightness-90'
								: ''}"
						/>
					{:else if entity.type === 'company'}
						<Building2 class="w-7 h-7 text-muted-foreground/60" />
					{:else}
						<User class="w-7 h-7 text-muted-foreground/60" />
					{/if}
				</div>

				<div class="space-y-1">
					<div class="flex items-center gap-2">
						<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
							{entity.name}
						</h1>
						<Badge variant="outline" class="text-[10px] uppercase font-semibold">
							{entity.subtitle}
						</Badge>
					</div>
					<div class="flex items-center gap-3 text-xs text-muted-foreground font-medium">
						<span>{data.totalCount} titles in Vault</span>
						{#if unreleasedCount > 0}
							<span>•</span>
							<span>{unreleasedCount} unreleased</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Live Progress Tracker Bar (STRICTLY OUT OF RELEASED TITLES) -->
			<div class="flex items-center gap-3">
				<div class="w-full sm:w-64 space-y-2 p-3 rounded-xl bg-card border border-border">
					<div class="flex items-center justify-between text-xs font-medium">
						<span class="text-muted-foreground">
							Watched <span class="text-foreground font-semibold">{watchedCount}</span> of {releasedCount}
						</span>
						<span class="text-primary font-bold">{completionPercentage}%</span>
					</div>
					<div
						class="w-full bg-muted/60 rounded-full h-2 overflow-hidden border border-border/40"
					>
						<div
							class="bg-primary h-full rounded-full transition-all duration-500 ease-out"
							style="width: {completionPercentage}%"
						></div>
					</div>
				</div>

				<!-- Sync / Refresh Button -->
				<form
					method="POST"
					action="?/sync"
					use:enhance={() => {
						isSyncing = true;
						return async ({ update }) => {
							await update();
							isSyncing = false;
						};
					}}
				>
					<Button
						type="submit"
						variant="outline"
						size="icon-sm"
						disabled={isSyncing}
						title="Sync / Refresh catalogue from TMDB"
						class="cursor-pointer"
					>
						<RotateCw class="w-4 h-4 {isSyncing ? 'animate-spin' : ''}" />
					</Button>
				</form>
			</div>
		</div>
	</div>

	<!-- Controls: Tabs on the left, Filters + Sort on the right -->
	<div
		class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3"
	>
		<!-- Left: View Tabs (ONLY All, Watched, Unwatched) -->
		<div class="flex items-center gap-1.5 flex-wrap">
			<Button
				variant={activeTab === 'all' ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (activeTab = 'all')}
			>
				All ({pool.length})
			</Button>
			<Button
				variant={activeTab === 'watched' ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (activeTab = 'watched')}
			>
				Watched ({watchedCount})
			</Button>
			<Button
				variant={activeTab === 'unwatched' ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (activeTab = 'unwatched')}
			>
				Unwatched ({pool.length - watchedCount})
			</Button>
		</div>

		<!-- Right: Liked Button + Show/Hide Unreleased Toggle + Sort Dropdown -->
		<div class="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
			<Button
				variant={likedOnly ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (likedOnly = !likedOnly)}
				class="gap-1.5 text-xs cursor-pointer {likedOnly ? 'border border-rose-500/30' : ''}"
			>
				<Heart
					class="w-3.5 h-3.5 {likedOnly
						? 'fill-rose-500 text-rose-500'
						: 'text-muted-foreground'}"
				/>
				Liked
			</Button>

			<!-- Toggle: Show/Hide Unreleased (OFF by default) -->
			{#if unreleasedCount > 0}
				<Button
					variant={showUnreleased ? 'secondary' : 'outline'}
					size="sm"
					onclick={() => (showUnreleased = !showUnreleased)}
					class="text-xs cursor-pointer {showUnreleased ? 'border-amber-500/40 text-amber-500' : ''}"
				>
					{showUnreleased ? 'Hide Unreleased' : 'Show Unreleased'}
				</Button>
			{/if}

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
					<ChevronDown
						class="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
					/>
				</div>
			</div>
		</div>
	</div>

	<!-- Titles Grid -->
	{#if displayedTitles.length > 0}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
			{#each displayedTitles as item (item.media_type + '_' + item.id)}
				{@const unreleased = isUnreleased(item)}
				<a href={`/title/${item.media_type}/${item.id}`} class="block h-full group">
					<Card.Root
						class="overflow-hidden transition hover:border-foreground/30 flex flex-col h-full bg-card border-border pt-0 gap-0"
					>
						<!-- Poster (Clean, no floating badges) -->
						<div class="relative aspect-2/3 bg-muted w-full overflow-hidden">
							{#if item.poster_path}
								<img
									src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
									alt={item.title}
									class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
									loading="lazy"
								/>
							{:else}
								<div
									class="flex items-center justify-center h-full text-xs text-muted-foreground p-2 text-center"
								>
									No Poster
								</div>
							{/if}
						</div>

						<!-- Card Info below poster -->
						<Card.Content class="p-3 flex-1 flex flex-col justify-between space-y-2">
							<h3
								class="font-semibold text-sm line-clamp-1 group-hover:underline text-foreground"
								title={item.title}
							>
								{item.title}
							</h3>

							<div class="flex items-center justify-between text-xs pt-1">
								<!-- PILLS ROW AT BOTTOM: [FILM] [UNRELEASED] [WATCHED] -->
								<div class="flex items-center gap-1.5 flex-wrap">
									<Badge variant="outline" class="text-[10px] uppercase font-medium">
										{item.media_type === 'movie' ? 'Film' : 'TV'}
									</Badge>

									{#if unreleased}
										<Badge
											variant="outline"
											class="text-[10px] uppercase font-medium text-amber-500 border-amber-500/40"
										>
											Unreleased
										</Badge>
									{/if}

									{#if item.user_watched === 1}
										<Badge
											variant="outline"
											class="text-[10px] text-emerald-500 border-emerald-500/30 font-medium"
										>
											Watched
										</Badge>
									{/if}
								</div>

								<!-- Rating / Year on the right -->
								<div class="flex items-center gap-1.5 shrink-0">
									{#if unreleased}
										<span class="text-[10px] text-muted-foreground font-medium">
											{item.release_date ? item.release_date.split('-')[0] : 'TBA'}
										</span>
									{:else if item.user_rating > 0}
										<span class="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
											★ {item.user_rating}
										</span>
									{:else if item.vote_average && item.vote_average > 0}
										<span class="text-xs text-muted-foreground">
											★ {(item.vote_average / 2).toFixed(1)}
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