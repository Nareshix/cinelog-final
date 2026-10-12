<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Building2, X, Loader2 } from 'lucide-svelte';

	type SearchItem = {
		id: number;
		title?: string;
		name?: string;
		overview?: string;
		poster_path?: string | null;
		profile_path?: string | null;
		logo_path?: string | null;
		media_type: 'movie' | 'tv' | 'person' | 'company';
		release_date?: string;
		first_air_date?: string;
		vote_average?: number;
		known_for_department?: string;
		origin_country?: string;
	};

	let searchQuery = $state(page.url.searchParams.get('q') || '');
	let results = $state<SearchItem[]>([]);
	let loading = $state(false);
	let activeFilter = $state<'all' | 'titles' | 'person' | 'company'>('all');
	let hasSearched = $state(false);

	async function performSearch() {
		const trimmed = searchQuery.trim();
		if (!trimmed) {
			results = [];
			loading = false;
			hasSearched = false;
			return;
		}

		loading = true;
		hasSearched = true;

		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
			const data = await res.json();
			results = data.results || [];

			// Update URL history only after Enter is pressed
			const newUrl = new URL(page.url);
			newUrl.searchParams.set('q', trimmed);
			goto(newUrl.toString(), { replaceState: true, keepFocus: true, noScroll: true });
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	}

	function handleFormSubmit(e: SubmitEvent) {
		e.preventDefault();
		// Dismiss mobile keyboard
		(document.activeElement as HTMLElement)?.blur();
		performSearch();
	}

	function clearSearch() {
		searchQuery = '';
		results = [];
		loading = false;
		hasSearched = false;
		const newUrl = new URL(page.url);
		newUrl.searchParams.delete('q');
		goto(newUrl.toString(), { replaceState: true, noScroll: true });
	}

	// Run initial search if URL had ?q= on load/refresh
	$effect(() => {
		const urlQuery = page.url.searchParams.get('q');
		if (urlQuery && results.length === 0 && !hasSearched && !loading) {
			searchQuery = urlQuery;
			performSearch();
		}
	});

	const filteredResults = $derived.by(() => {
		if (activeFilter === 'titles') {
			return results.filter((r) => r.media_type === 'movie' || r.media_type === 'tv');
		}
		if (activeFilter === 'person') {
			return results.filter((r) => r.media_type === 'person');
		}
		if (activeFilter === 'company') {
			return results.filter((r) => r.media_type === 'company');
		}
		return results;
	});

	function getItemTitle(item: SearchItem) {
		return item.title || item.name || 'Untitled';
	}

	function getItemYear(item: SearchItem) {
		const date = item.release_date || item.first_air_date;
		return date ? date.split('-')[0] : '';
	}

	function getItemUrl(item: SearchItem) {
		if (item.media_type === 'person') return `/person/${item.id}`;
		if (item.media_type === 'company') return `/company/${item.id}`;
		return `/title/${item.media_type}/${item.id}`;
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<main class="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
		<!-- Search Header -->
		<div class="max-w-xl mx-auto text-center space-y-3">
			<h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
				Discover Movies, People & Studios
			</h2>
			<p class="text-muted-foreground text-xs sm:text-sm">
				Search TMDB for movies, TV series, actors, directors, and production companies.
			</p>

			<!-- Search Form (Submits strictly on Enter / Mobile Search Button) -->
			<form onsubmit={handleFormSubmit} class="relative pt-2">
				<div class="relative w-full">
					<Input
						type="text"
						enterkeyhint="search"
						autocapitalize="none"
						autocorrect="off"
						spellcheck="false"
						placeholder="Search e.g. Interstellar, Nolan, DiCaprio, A24..."
						bind:value={searchQuery}
						class="w-full text-base h-11 sm:h-12 pl-4 pr-11 shadow-sm"
					/>

					<!-- Centered X Clear / Loading Spinner -->
					<div class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
						{#if loading}
							<Loader2 class="w-4 h-4 animate-spin text-muted-foreground" />
						{:else if searchQuery.length > 0}
							<button
								type="button"
								onclick={clearSearch}
								class="pointer-events-auto text-muted-foreground hover:text-foreground p-1 rounded-full cursor-pointer touch-manipulation flex items-center justify-center transition"
								aria-label="Clear search"
							>
								<X class="w-4 h-4" />
							</button>
						{/if}
					</div>
				</div>
			</form>

			<!-- Filter Pills -->
			{#if results.length > 0}
				<div class="flex items-center justify-start sm:justify-center gap-1.5 pt-2 overflow-x-auto no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
					<Button
						variant={activeFilter === 'all' ? 'secondary' : 'ghost'}
						size="xs"
						class="shrink-0"
						onclick={() => (activeFilter = 'all')}
					>
						All ({results.length})
					</Button>
					<Button
						variant={activeFilter === 'titles' ? 'secondary' : 'ghost'}
						size="xs"
						class="shrink-0"
						onclick={() => (activeFilter = 'titles')}
					>
						Movies & Shows
					</Button>
					<Button
						variant={activeFilter === 'person' ? 'secondary' : 'ghost'}
						size="xs"
						class="shrink-0"
						onclick={() => (activeFilter = 'person')}
					>
						People
					</Button>
					<Button
						variant={activeFilter === 'company' ? 'secondary' : 'ghost'}
						size="xs"
						class="shrink-0"
						onclick={() => (activeFilter = 'company')}
					>
						Studios
					</Button>
				</div>
			{/if}
		</div>

		<!-- Loading Skeletons -->
		{#if loading}
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
				{#each Array(10) as _}
					<div class="space-y-2">
						<Skeleton class="h-56 sm:h-64 w-full rounded-lg" />
						<Skeleton class="h-4 w-3/4" />
						<Skeleton class="h-3 w-1/2" />
					</div>
				{/each}
			</div>
		{/if}

		<!-- Results Grid -->
		{#if !loading && filteredResults.length > 0}
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
				{#each filteredResults as item (item.media_type + '_' + item.id)}
					<a href={getItemUrl(item)} class="block h-full">
						<Card.Root class="group overflow-hidden cursor-pointer transition hover:border-foreground/30 flex flex-col h-full bg-card border-border pt-0 gap-0">
							<!-- Thumbnail container -->
							<div class="relative aspect-2/3 bg-muted w-full overflow-hidden flex items-center justify-center">
								<!-- Movie / TV Poster -->
								{#if item.media_type === 'movie' || item.media_type === 'tv'}
									{#if item.poster_path}
										<img
											src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
											alt={getItemTitle(item)}
											class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
											loading="lazy"
										/>
									{:else}
										<div class="text-xs text-muted-foreground p-2 text-center">No Poster</div>
									{/if}

								<!-- Person Profile Photo -->
								{:else if item.media_type === 'person'}
									{#if item.profile_path}
										<img
											src={`https://image.tmdb.org/t/p/h632${item.profile_path}`}
											alt={getItemTitle(item)}
											class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
											loading="lazy"
										/>
									{:else}
										<div class="text-xs text-muted-foreground p-2 text-center">No Photo</div>
									{/if}

								<!-- Company Logo -->
								{:else if item.media_type === 'company'}
									<div class="p-4 w-full h-full flex items-center justify-center bg-white/5">
										{#if item.logo_path}
											<img
												src={`https://image.tmdb.org/t/p/w300${item.logo_path}`}
												alt={getItemTitle(item)}
												class="max-h-full max-w-full object-contain filter brightness-90 group-hover:scale-105 transition-transform"
												loading="lazy"
											/>
										{:else}
											<Building2 class="w-10 h-10 text-muted-foreground/60" />
										{/if}
									</div>
								{/if}

								<Badge variant="secondary" class="absolute top-2 right-2 uppercase text-[10px] tracking-wider font-semibold shadow">
									{item.media_type === 'movie' ? 'Film' : item.media_type === 'tv' ? 'TV' : item.media_type}
								</Badge>
							</div>

							<!-- Card Info -->
							<Card.Content class="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
								<h3 class="font-semibold text-xs sm:text-sm line-clamp-1 group-hover:underline" title={getItemTitle(item)}>
									{getItemTitle(item)}
								</h3>

								<div class="flex items-center justify-between text-xs text-muted-foreground mt-2">
									{#if item.media_type === 'movie' || item.media_type === 'tv'}
										<span>{getItemYear(item)}</span>
										{#if item.vote_average && item.vote_average > 0}
											<span class="font-medium text-amber-500">★ {item.vote_average.toFixed(1)}</span>
										{/if}
									{:else if item.media_type === 'person'}
										<span class="capitalize text-[11px]">{item.known_for_department || 'Artist'}</span>
									{:else if item.media_type === 'company'}
										<span class="text-[11px]">{item.origin_country || 'Studio'}</span>
									{/if}
								</div>
							</Card.Content>
						</Card.Root>
					</a>
				{/each}
			</div>
		{/if}

		<!-- Empty States -->
		{#if !loading && hasSearched && searchQuery.trim() !== '' && filteredResults.length === 0}
			<div class="text-center py-16 text-muted-foreground text-sm">
				No results found matching "{searchQuery}".
			</div>
		{/if}

		{#if !loading && !hasSearched}
			<div class="text-center py-16 text-muted-foreground/60 text-xs sm:text-sm">
				Type a title, actor, director, or studio and press <span class="font-semibold text-foreground/80">Enter</span> to search.
			</div>
		{/if}
	</main>
</div>