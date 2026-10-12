<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { Star, Building2, MapPin, Globe, ChevronDown } from 'lucide-svelte';

	let { data } = $props();
	const company = $derived(data.company);

let titles = $state<any[]>([]);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalResults = $state(0);

	$effect(() => {
		titles = [...data.initialTitles];
		totalPages = data.initialTotalPages;
		totalResults = data.initialTotalResults;
	});
	let activeMedia = $state<'movie' | 'tv'>('movie');
	let sortBy = $state('primary_release_date.desc');
	let loading = $state(false);
	let isUpcomingExpanded = $state(false);

	const today = new Date().toISOString().split('T')[0];

	function isUpcoming(item: any): boolean {
		const date = item.release_date || item.first_air_date;
		if (!date || date.trim() === '') return true;
		return date > today;
	}

	const upcomingTitles = $derived.by(() => {
		return titles.filter((t) => isUpcoming(t));
	});

	const releasedTitles = $derived.by(() => {
		return titles.filter((t) => !isUpcoming(t));
	});

	async function reloadList(media: 'movie' | 'tv', sort: string) {
		activeMedia = media;
		sortBy = sort;
		currentPage = 1;
		loading = true;

		try {
			const res = await fetch(
				`/api/company?id=${company.id}&page=1&media=${media}&sort=${sort}`
			);
			const result = await res.json();
			titles = result.titles || [];
			totalPages = result.totalPages || 1;
			totalResults = result.totalResults || 0;
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	}

	async function loadMore() {
		if (loading || currentPage >= totalPages) return;
		loading = true;
		const nextPage = currentPage + 1;

		try {
			const res = await fetch(
				`/api/company?id=${company.id}&page=${nextPage}&media=${activeMedia}&sort=${sortBy}`
			);
			const result = await res.json();
			titles = [...titles, ...(result.titles || [])];
			currentPage = nextPage;
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="max-w-6xl mx-auto px-6 py-10 space-y-12">
	<!-- Company Header -->
	<div class="flex flex-col sm:flex-row items-start sm:items-center gap-6 border-b border-border pb-8">
		<div class="w-32 h-20 bg-white/5 border border-border rounded-xl p-3 flex items-center justify-center shrink-0">
			{#if company.logo_path}
				<img
					src={`https://image.tmdb.org/t/p/w300${company.logo_path}`}
					alt={company.name}
					class="max-w-full max-h-full object-contain filter brightness-90"
				/>
			{:else}
				<Building2 class="w-8 h-8 text-muted-foreground/60" />
			{/if}
		</div>

		<div class="space-y-2">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
					{company.name}
				</h1>
				<form method="POST" action="?/toggleStar" use:enhance>
					<input type="hidden" name="name" value={company.name} />
					<input type="hidden" name="image_path" value={company.logo_path || ''} />
					<input type="hidden" name="subtitle" value={company.origin_country || 'Studio'} />
					<input type="hidden" name="is_starred" value={data.isStarred.toString()} />
					<Button
						type="submit"
						variant={data.isStarred ? 'secondary' : 'outline'}
						size="sm"
						class="gap-1.5 text-xs cursor-pointer"
					>
						<Star class="w-3.5 h-3.5 {data.isStarred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}" />
						{data.isStarred ? 'Starred' : 'Star Studio'}
					</Button>
				</form>
			</div>

			<div class="flex items-center gap-4 text-xs text-muted-foreground font-medium flex-wrap">
				{#if company.headquarters}
					<span class="flex items-center gap-1">
						<MapPin class="w-3.5 h-3.5" />
						{company.headquarters}
					</span>
				{/if}
				{#if company.origin_country}
					<Badge variant="outline" class="uppercase text-[10px]">
						{company.origin_country}
					</Badge>
				{/if}
				{#if company.homepage}
					<a
						href={company.homepage}
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-1 text-foreground hover:underline"
					>
						<Globe class="w-3.5 h-3.5" />
						Website
					</a>
				{/if}
			</div>
			{#if company.description}
				<p class="text-sm text-muted-foreground leading-relaxed max-w-2xl">
					{company.description}
				</p>
			{/if}
		</div>
	</div>

	<!-- Produced Titles Section -->
	<div class="space-y-6">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
			<h2 class="text-2xl font-bold tracking-tight text-foreground">
				Produced Titles <span class="text-sm text-muted-foreground font-normal">({totalResults.toLocaleString()} total)</span>
			</h2>

			<!-- Filters & Sorting -->
			<div class="flex flex-wrap items-center gap-3">
				<div class="flex items-center gap-1">
					<Button
						variant={activeMedia === 'movie' ? 'secondary' : 'ghost'}
						size="sm"
						onclick={() => reloadList('movie', sortBy)}
					>
						Movies
					</Button>
					<Button
						variant={activeMedia === 'tv' ? 'secondary' : 'ghost'}
						size="sm"
						onclick={() => reloadList('tv', sortBy)}
					>
						TV Series
					</Button>
				</div>

				<div class="flex items-center gap-1.5">
					<span class="text-xs text-muted-foreground">Sort:</span>
					<select
						value={sortBy}
						onchange={(e) => reloadList(activeMedia, e.currentTarget.value)}
						class="bg-card border border-input rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
					>
						<option value="primary_release_date.desc">Newest First</option>
						<option value="primary_release_date.asc">Oldest First</option>
						<option value="popularity.desc">Most Popular</option>
						<option value="vote_average.desc">Highest Rated</option>
					</select>
				</div>
			</div>
		</div>

		<!-- INLINE EXPANDABLE: Company Upcoming & Announced -->
		{#if upcomingTitles.length > 0}
			<div class="rounded-xl border border-border bg-card/60 overflow-hidden transition-all">
				<button
					type="button"
					onclick={() => (isUpcomingExpanded = !isUpcomingExpanded)}
					class="w-full flex items-center justify-between p-3.5 hover:bg-accent/40 transition cursor-pointer text-left select-none"
				>
					<div class="flex items-center gap-2.5">
						<Badge variant="outline" class="border-amber-500/40 text-amber-500 uppercase text-[10px] tracking-wider font-semibold">
							Upcoming & Announced
						</Badge>
						<span class="text-xs font-medium text-foreground">
							{upcomingTitles.length} future projects in catalogue
						</span>
					</div>
					<div class="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
						<span>{isUpcomingExpanded ? 'Hide' : 'Show'}</span>
						<ChevronDown class="w-4 h-4 transition-transform duration-200 {isUpcomingExpanded ? 'rotate-180' : ''}" />
					</div>
				</button>

				{#if isUpcomingExpanded}
					<div class="divide-y divide-border border-t border-border px-4 sm:px-5 bg-background/50">
						{#each upcomingTitles as item}
							{@const year = (item.release_date || item.first_air_date || '').split('-')[0] || 'TBA'}
							<div class="py-3.5 flex items-center justify-between gap-4">
								<div class="flex items-center gap-3.5 min-w-0">
									<a
										href={`/title/${item.media_type}/${item.id}`}
										class="w-12 h-18 shrink-0 bg-muted rounded overflow-hidden border border-border block"
									>
										{#if item.poster_path}
											<img
												src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
												alt={item.title || item.name}
												class="w-full h-full object-cover"
											/>
										{:else}
											<div class="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground text-center">
												TBA
											</div>
										{/if}
									</a>
									<div class="min-w-0 space-y-0.5">
										<a
											href={`/title/${item.media_type}/${item.id}`}
											class="font-semibold text-sm hover:underline text-foreground truncate block"
										>
											{item.title || item.name}
										</a>
										{#if item.overview}
											<p class="text-xs text-muted-foreground line-clamp-1">
												{item.overview}
											</p>
										{/if}
									</div>
								</div>
								<Badge variant="secondary" class="text-xs font-semibold shrink-0">
									{year}
								</Badge>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Released Titles List -->
		<div class="divide-y divide-border border-y border-border">
			{#each releasedTitles as item (item.media_type + '_' + item.id)}
				{@const year = (item.release_date || item.first_air_date || '').split('-')[0] || '—'}
				<div class="py-3.5 px-3 sm:px-5 flex items-center justify-between gap-4 hover:bg-card/60 transition rounded-lg">
					<!-- Poster + Title + Overview preview -->
					<div class="flex items-center gap-4 min-w-0">
						<a
							href={`/title/${item.media_type}/${item.id}`}
							class="w-12 h-18 shrink-0 bg-muted rounded overflow-hidden border border-border"
						>
							{#if item.poster_path}
								<img
									src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
									alt={item.title || item.name}
									class="w-full h-full object-cover"
									loading="lazy"
								/>
							{:else}
								<div class="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground text-center">
									No Pic
								</div>
							{/if}
						</a>

						<div class="min-w-0 space-y-0.5">
							<div class="flex items-center gap-2 flex-wrap">
								<a
									href={`/title/${item.media_type}/${item.id}`}
									class="font-semibold text-sm hover:underline text-foreground truncate"
								>
									{item.title || item.name}
								</a>
								<Badge variant="outline" class="text-[10px] uppercase font-medium">
									{item.media_type === 'movie' ? 'Film' : 'TV'}
								</Badge>
							</div>

							{#if item.overview}
								<p class="text-xs text-muted-foreground line-clamp-1 max-w-xl">
									{item.overview}
								</p>
							{/if}
						</div>
					</div>

					<!-- Year + Rating on the right -->
					<div class="flex items-center gap-5 sm:gap-6 shrink-0 text-right pr-1 sm:pr-3">
						<span class="text-xs text-muted-foreground font-medium">{year}</span>
						<div class="flex items-center gap-1.5 w-14 justify-end">
							{#if item.vote_average && item.vote_average > 0}
								<Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
								<span class="text-xs font-semibold text-foreground">
									{(item.vote_average / 2).toFixed(1)}
								</span>
							{:else}
								<span class="text-xs text-muted-foreground/60">—</span>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Show More Button -->
		{#if currentPage < totalPages}
			<div class="pt-4 flex justify-center">
				<Button
					variant="outline"
					size="sm"
					disabled={loading}
					onclick={loadMore}
					class="gap-1.5"
				>
					<ChevronDown class="w-4 h-4" />
					{loading ? 'Loading...' : `Show More (${titles.length} of ${totalResults.toLocaleString()})`}
				</Button>
			</div>
		{/if}
	</div>
</div>