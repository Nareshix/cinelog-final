<script lang="ts">
	import { tick } from 'svelte';
	import StarRating from '#lib/components/ui/star-rating/star-rating.svelte';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { enhance } from '$app/forms';
	import {
		Star,
		Eye,
		Heart,
		Bookmark,
		Check,
		StickyNote,
		Clapperboard,
		Sparkles,
		Building2,
		ListPlus,
		Plus
	} from 'lucide-svelte';

	let { data } = $props();
	const item = $derived(data.item);
	const mediaType = $derived(data.type);

	const title = $derived(item.title || item.name || 'Untitled');
	const releaseDate = $derived(item.release_date || item.first_air_date);
	const releaseYear = $derived(releaseDate ? releaseDate.split('-')[0] : 'N/A');

	const formattedRuntime = $derived.by(() => {
		const minutes =
			mediaType === 'movie'
				? item.runtime || 0
				: item.episode_run_time?.[0] || item.last_episode_to_air?.runtime || 0;

		if (!minutes) return mediaType === 'tv' ? '~45m' : 'N/A';
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
	});

	const tmdbRating = $derived(
		item.vote_average ? (item.vote_average / 2).toFixed(1) : 'NR'
	);

	let watched = $state(false);
	let liked = $state(false);
	let watchlist = $state(false);
	let userRating = $state(0);
	let notes = $state('');
	let isSaving = $state(false);
	let formElement = $state<HTMLFormElement | null>(null);

	let isListModalOpen = $state(false);
	let newListName = $state('');

	$effect(() => {
		if (data.userLog) {
			watched = data.userLog.watched === 1;
			liked = data.userLog.liked === 1;
			watchlist = data.userLog.watchlist === 1;
			userRating = data.userLog.rating ?? 0;
			notes = data.userLog.notes ?? '';
		}
	});

	async function submitLog() {
		await tick();
		if (formElement) {
			formElement.requestSubmit();
		}
	}

	function handleRatingChange(val: number) {
		userRating = val;
		if (val > 0) {
			watched = true;
			watchlist = false;
		}
		submitLog();
	}

	function toggleWatch() {
		watched = !watched;
		if (watched) {
			watchlist = false;
		} else {
			userRating = 0;
		}
		submitLog();
	}

	function toggleLike() {
		liked = !liked;
		submitLog();
	}

	function toggleWatchlist() {
		watchlist = !watchlist;
		if (watchlist) {
			watched = false;
			userRating = 0;
		}
		submitLog();
	}

	const directors = $derived(
		(item.credits?.crew || []).filter((c: any) => c.job === 'Director')
	);
	const creators = $derived(item.created_by || []);
	const castMembers = $derived(item.credits?.cast || []);
	const productionCompanies = $derived(item.production_companies || []);
	const recommendations = $derived(item.recommendations?.results || []);
	const imdbId = $derived(item.imdb_id || item.external_ids?.imdb_id);
</script>

<div class="min-h-screen bg-background text-foreground pb-20">
	<form
		bind:this={formElement}
		method="POST"
		action="?/saveLog"
		use:enhance={() => {
			isSaving = true;
			return async ({ update }) => {
				await update({ reset: false });
				isSaving = false;
			};
		}}
		class="hidden"
	>
		<input type="hidden" name="title" value={title} />
		<input type="hidden" name="poster_path" value={item.poster_path || ''} />
		<input type="hidden" name="watched" value={watched.toString()} />
		<input type="hidden" name="liked" value={liked.toString()} />
		<input type="hidden" name="watchlist" value={watchlist.toString()} />
		<input type="hidden" name="rating" value={userRating.toString()} />
		<input type="hidden" name="notes" value={notes} />
		<input type="hidden" name="vote_average" value={item.vote_average?.toString() || '0'} />
		<input type="hidden" name="popularity" value={item.popularity?.toString() || '0'} />
	</form>

	<main class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 sm:pt-8 space-y-10 sm:space-y-12">
		<!-- Hero Section: Responsive Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
			<!-- Poster & External Links -->
			<div class="lg:col-span-3 space-y-3">
				<div class="relative aspect-2/3 max-w-[240px] sm:max-w-xs lg:max-w-none mx-auto w-full rounded-xl overflow-hidden shadow-lg border border-border bg-muted">
					{#if item.poster_path}
						<img
							src={`https://image.tmdb.org/t/p/original${item.poster_path}`}
							alt={title}
							class="w-full h-full object-cover"
						/>
					{:else}
						<div class="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
							No Poster Available
						</div>
					{/if}
				</div>

				<div class="flex items-center justify-center lg:justify-start gap-2 text-xs text-muted-foreground/80 pt-1">
					<span>More at</span>
					<div class="flex items-center gap-1.5 flex-wrap">
						<a
							href={`https://www.themoviedb.org/${mediaType}/${item.id}`}
							target="_blank"
							rel="noopener noreferrer"
							class="px-2 py-0.5 rounded border border-border text-[11px] font-medium tracking-wide text-muted-foreground hover:text-foreground hover:border-foreground/40 transition bg-card"
						>
							TMDB
						</a>
						{#if imdbId}
							<a
								href={`https://www.imdb.com/title/${imdbId}`}
								target="_blank"
								rel="noopener noreferrer"
								class="px-2 py-0.5 rounded border border-border text-[11px] font-medium tracking-wide text-muted-foreground hover:text-foreground hover:border-foreground/40 transition bg-card"
							>
								IMDb
							</a>
						{/if}
						{#if mediaType === 'movie'}
							<a
								href={`https://letterboxd.com/tmdb/${item.id}`}
								target="_blank"
								rel="noopener noreferrer"
								class="px-2 py-0.5 rounded border border-border text-[11px] font-medium tracking-wide text-muted-foreground hover:text-foreground hover:border-foreground/40 transition bg-card"
							>
								Letterboxd
							</a>
						{/if}
					</div>
				</div>
			</div>

			<!-- Center Details (Title, Metadata & Synopsis) -->
			<div class="lg:col-span-6 space-y-5">
				<div class="space-y-2">
					<h1 class="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
						{title}
					</h1>

					<div class="flex items-center gap-2 sm:gap-3 flex-wrap text-xs sm:text-sm text-muted-foreground font-medium pt-1">
						<span>{releaseYear}</span>
						<span>•</span>
						<Badge variant="outline" class="text-[10px] sm:text-xs uppercase font-semibold">
							{mediaType === 'movie' ? 'Film' : 'TV Series'}
						</Badge>
						<span>•</span>
						<span>{formattedRuntime}</span>
						<span>•</span>
						<div class="flex items-center gap-1 text-foreground font-semibold">
							<Star class="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-primary text-primary" />
							<span>{tmdbRating}</span>
							<span class="text-xs text-muted-foreground font-normal">/ 5</span>
							<span class="text-xs text-muted-foreground font-normal">
								({item.vote_count ? item.vote_count.toLocaleString() : 0})
							</span>
						</div>
					</div>
				</div>

				{#if item.genres && item.genres.length > 0}
					<div class="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
						{#each item.genres as genre}
							<Badge variant="secondary" class="text-xs px-2 sm:px-2.5 py-0.5 font-medium">
								{genre.name}
							</Badge>
						{/each}
					</div>
				{/if}

				<!-- Mobile Action Card: Displayed right here on small screens -->
				<div class="block lg:hidden pt-2">
					<Card.Root class="overflow-hidden shadow-sm border border-border rounded-xl select-none bg-card p-0 gap-0">
						<div class="grid grid-cols-3 text-center py-3 px-2">
							<button
								type="button"
								onclick={toggleWatch}
								class="flex flex-col items-center gap-1.5 py-1 transition cursor-pointer touch-manipulation {watched ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}"
							>
								<Eye class="w-5 h-5 transition-transform {watched ? 'fill-emerald-500/20' : ''}" />
								<span class="text-xs font-medium">{watched ? 'Watched' : 'Watch'}</span>
							</button>

							<button
								type="button"
								onclick={toggleLike}
								class="flex flex-col items-center gap-1.5 py-1 transition cursor-pointer touch-manipulation {liked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-400'}"
							>
								<Heart class="w-5 h-5 transition-transform {liked ? 'fill-rose-500' : ''}" />
								<span class="text-xs font-medium">{liked ? 'Liked' : 'Like'}</span>
							</button>

							<button
								type="button"
								onclick={toggleWatchlist}
								class="flex flex-col items-center gap-1.5 py-1 transition cursor-pointer touch-manipulation {watchlist ? 'text-sky-500' : 'text-muted-foreground hover:text-foreground'}"
							>
								<Bookmark class="w-5 h-5 transition-transform {watchlist ? 'fill-sky-500' : ''}" />
								<span class="text-xs font-medium">{watchlist ? 'In List' : 'Watchlist'}</span>
							</button>
						</div>

						<Separator />

						<div class="py-3 px-4 flex flex-col items-center space-y-1.5">
							<span class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
								{userRating > 0 ? 'Rated' : 'Rate'}
							</span>
							<StarRating
								bind:value={userRating}
								onValueChange={handleRatingChange}
							/>
						</div>

						<Separator />

						<Button
							variant="ghost"
							onclick={() => (isListModalOpen = true)}
							class="w-full h-10 rounded-none justify-center gap-2 text-xs text-muted-foreground hover:text-foreground border-none hover:bg-accent/50"
						>
							<ListPlus class="w-4 h-4" />
							Add to lists...
						</Button>
					</Card.Root>
				</div>

				{#if item.overview}
					<div class="space-y-1.5 pt-1">
						<h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Overview
						</h3>
						<p class="text-sm text-foreground/90 leading-relaxed font-normal">
							{item.overview}
						</p>
					</div>
				{/if}

				<Separator />

				<!-- Personal Notes Workspace -->
				<div class="space-y-2 pt-1">
					<div class="flex items-center justify-between">
						<label
							for="personal-notes"
							class="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
						>
							<StickyNote class="w-3.5 h-3.5" />
							Personal Notes
						</label>
						<span class="text-[11px] text-muted-foreground">
							{isSaving ? 'Saving...' : data.userLog ? 'Saved' : 'Draft'}
						</span>
					</div>

					<textarea
						id="personal-notes"
						bind:value={notes}
						placeholder="Write your private thoughts, memorable moments, or review notes here..."
						rows="4"
						class="w-full rounded-xl border border-input bg-card p-3.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none leading-relaxed"
					></textarea>

					<div class="flex justify-end">
						<Button size="sm" onclick={submitLog} disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save Note'}
						</Button>
					</div>
				</div>
			</div>

			<!-- Desktop Action Card (hidden on mobile, visible on lg) -->
			<div class="hidden lg:block lg:col-span-3">
				<Card.Root class="overflow-hidden shadow-sm border border-border rounded-xl select-none bg-card p-0 gap-0">
					<div class="grid grid-cols-3 text-center py-4 px-2">
						<button
							type="button"
							onclick={toggleWatch}
							class="flex flex-col items-center gap-1.5 group py-1 transition cursor-pointer {watched ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}"
						>
							<Eye class="w-6 h-6 transition-transform group-hover:scale-110 {watched ? 'fill-emerald-500/20' : ''}" />
							<span class="text-xs font-medium">{watched ? 'Watched' : 'Watch'}</span>
						</button>

						<button
							type="button"
							onclick={toggleLike}
							class="flex flex-col items-center gap-1.5 group py-1 transition cursor-pointer {liked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-400'}"
						>
							<Heart class="w-6 h-6 transition-transform group-hover:scale-110 {liked ? 'fill-rose-500' : ''}" />
							<span class="text-xs font-medium">{liked ? 'Liked' : 'Like'}</span>
						</button>

						<button
							type="button"
							onclick={toggleWatchlist}
							class="flex flex-col items-center gap-1.5 group py-1 transition cursor-pointer {watchlist ? 'text-sky-500' : 'text-muted-foreground hover:text-foreground'}"
						>
							<Bookmark class="w-6 h-6 transition-transform group-hover:scale-110 {watchlist ? 'fill-sky-500' : ''}" />
							<span class="text-xs font-medium">{watchlist ? 'In List' : 'Watchlist'}</span>
						</button>
					</div>

					<Separator />

					<div class="py-4 px-4 flex flex-col items-center space-y-2">
						<span class="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
							{userRating > 0 ? 'Rated' : 'Rate'}
						</span>
						<StarRating
							bind:value={userRating}
							onValueChange={handleRatingChange}
						/>
					</div>

					<Separator />

					<Button
						variant="ghost"
						onclick={() => (isListModalOpen = true)}
						class="w-full h-11 rounded-none justify-center gap-2 text-xs text-muted-foreground hover:text-foreground border-none hover:bg-accent/50"
					>
						<ListPlus class="w-4 h-4" />
						Add to lists...
					</Button>
				</Card.Root>
			</div>
		</div>

		<!-- Directors Section: Swipeable Carousel -->
		{#if directors.length > 0}
			<Separator class="my-6" />
			<div class="space-y-4">
				<h2 class="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
					<Clapperboard class="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
					{directors.length === 1 ? 'Director' : 'Directors'}
				</h2>
				<div class="flex gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
					{#each directors as director}
						<a href={`/person/${director.id}`} class="block group shrink-0">
							<Card.Root class="w-32 sm:w-36 shrink-0 p-3 flex flex-col items-center text-center space-y-2 border border-border shadow-none hover:bg-accent/60 transition bg-card">
								<div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-muted shrink-0 shadow-inner">
									{#if director.profile_path}
										<img
											src={`https://image.tmdb.org/t/p/w185${director.profile_path}`}
											alt={director.name}
											class="w-full h-full object-cover group-hover:scale-105 transition-transform"
											loading="lazy"
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
											No Pic
										</div>
									{/if}
								</div>
								<div class="min-w-0 w-full">
									<p class="font-semibold text-xs truncate text-foreground group-hover:underline" title={director.name}>
										{director.name}
									</p>
									<p class="text-[11px] text-muted-foreground truncate">Director</p>
								</div>
							</Card.Root>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Creators Section -->
		{#if creators.length > 0}
			<Separator class="my-6" />
			<div class="space-y-4">
				<h2 class="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
					<Sparkles class="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
					{creators.length === 1 ? 'Creator' : 'Creators'}
				</h2>
				<div class="flex gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
					{#each creators as creator}
						<a href={`/person/${creator.id}`} class="block group shrink-0">
							<Card.Root class="w-32 sm:w-36 shrink-0 p-3 flex flex-col items-center text-center space-y-2 border border-border shadow-none hover:bg-accent/60 transition bg-card">
								<div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-muted shrink-0 shadow-inner">
									{#if creator.profile_path}
										<img
											src={`https://image.tmdb.org/t/p/w185${creator.profile_path}`}
											alt={creator.name}
											class="w-full h-full object-cover group-hover:scale-105 transition-transform"
											loading="lazy"
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
											No Pic
										</div>
									{/if}
								</div>
								<div class="min-w-0 w-full">
									<p class="font-semibold text-xs truncate text-foreground group-hover:underline" title={creator.name}>
										{creator.name}
									</p>
									<p class="text-[11px] text-muted-foreground truncate">Creator</p>
								</div>
							</Card.Root>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Top Cast Section -->
		{#if castMembers.length > 0}
			<Separator class="my-6" />
			<div class="space-y-4">
				<h2 class="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Cast</h2>
				<div class="flex gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
					{#each castMembers as actor}
						<a href={`/person/${actor.id}`} class="block group shrink-0">
							<Card.Root class="w-32 sm:w-36 shrink-0 p-3 flex flex-col items-center text-center space-y-2 border border-border shadow-none hover:bg-accent/60 transition bg-card">
								<div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-muted shrink-0 shadow-inner">
									{#if actor.profile_path}
										<img
											src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
											alt={actor.name}
											class="w-full h-full object-cover group-hover:scale-105 transition-transform"
											loading="lazy"
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
											No Pic
										</div>
									{/if}
								</div>
								<div class="min-w-0 w-full">
									<p class="font-semibold text-xs truncate text-foreground group-hover:underline" title={actor.name}>{actor.name}</p>
									<p class="text-[11px] text-muted-foreground truncate" title={actor.character}>
										{actor.character}
									</p>
								</div>
							</Card.Root>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Production Companies Section -->
		{#if productionCompanies.length > 0}
			<Separator class="my-6" />
			<div class="space-y-4">
				<h2 class="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
					<Building2 class="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
					Production Companies
				</h2>
				<div class="flex gap-3 overflow-x-auto pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
					{#each productionCompanies as comp}
						<a href={`/company/${comp.id}`} class="block group shrink-0">
							<Card.Root class="w-36 sm:w-44 shrink-0 p-3 flex flex-col items-center justify-between text-center space-y-2 border border-border shadow-none hover:bg-accent/40 transition bg-card">
								<div class="w-full h-12 flex items-center justify-center p-1 bg-white/5 rounded-md">
									{#if comp.logo_path}
										<img
											src={`https://image.tmdb.org/t/p/w185${comp.logo_path}`}
											alt={comp.name}
											class="max-h-full max-w-full object-contain filter brightness-90 group-hover:scale-105 transition-transform"
											loading="lazy"
										/>
									{:else}
										<Building2 class="w-5 h-5 text-muted-foreground/60" />
									{/if}
								</div>
								<p class="text-xs font-medium text-foreground truncate w-full group-hover:underline" title={comp.name}>
									{comp.name}
								</p>
							</Card.Root>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Recommendations Section -->
		{#if recommendations.length > 0}
			<Separator class="my-6" />
			<div class="space-y-4">
				<h2 class="text-xl sm:text-2xl font-bold tracking-tight text-foreground">More like this</h2>

				<div class="flex gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
					{#each recommendations as rec}
						<a
							href={`/title/${rec.media_type || mediaType}/${rec.id}`}
							class="w-36 sm:w-44 shrink-0 group rounded-lg overflow-hidden border border-border bg-card flex flex-col transition hover:border-foreground/40 hover:scale-[1.02]"
						>
							<div class="aspect-2/3 bg-muted w-full overflow-hidden">
								{#if rec.poster_path}
									<img
										src={`https://image.tmdb.org/t/p/w342${rec.poster_path}`}
										alt={rec.title || rec.name}
										class="w-full h-full object-cover group-hover:scale-105 transition-transform"
										loading="lazy"
									/>
								{:else}
									<div class="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center p-2">
										No Poster
									</div>
								{/if}
							</div>
							<div class="p-2 space-y-1">
								<p class="text-xs font-semibold text-foreground truncate" title={rec.title || rec.name}>
									{rec.title || rec.name}
								</p>
								<div class="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
									<Star class="w-3 h-3 fill-primary text-primary" />
									<span>{rec.vote_average ? (rec.vote_average / 2).toFixed(1) : ''}</span>
									<span class="text-[10px]">/ 5</span>
								</div>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</main>

	<!-- Add to Lists Dialog (Mobile Scroll-Friendly) -->
	<Dialog.Root bind:open={isListModalOpen}>
		<Dialog.Content class="sm:max-w-md max-h-[85vh] overflow-y-auto">
			<Dialog.Header>
				<Dialog.Title class="text-lg font-bold">Add to Lists</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground">
					Select the custom lists you'd like to include <span class="font-semibold text-foreground">{title}</span> in.
				</Dialog.Description>
			</Dialog.Header>

			<div class="max-h-60 overflow-y-auto divide-y divide-border border-y border-border -mx-6 px-6 my-2">
				{#if data.userLists && data.userLists.length > 0}
					{#each data.userLists as uList (uList.id)}
						<form method="POST" action="?/toggleListItem" use:enhance class="py-2.5 flex items-center justify-between">
							<input type="hidden" name="list_id" value={uList.id} />
							<input type="hidden" name="title" value={title} />
							<input type="hidden" name="poster_path" value={item.poster_path || ''} />
							<input type="hidden" name="in_list" value={uList.inList.toString()} />

							<span class="text-sm font-medium">{uList.name}</span>
							<Button
								type="submit"
								variant={uList.inList ? 'secondary' : 'outline'}
								size="xs"
								class="gap-1 text-xs"
							>
								{#if uList.inList}
									<Check class="w-3.5 h-3.5 text-emerald-500" />
									Added
								{:else}
									<Plus class="w-3.5 h-3.5" />
									Add
								{/if}
							</Button>
						</form>
					{/each}
				{:else}
					<div class="py-6 text-center text-xs text-muted-foreground">
						You haven't created any custom lists yet.
					</div>
				{/if}
			</div>

			<form
				method="POST"
				action="?/createListAndAdd"
				use:enhance={() => {
					return async ({ update }) => {
						newListName = '';
						await update();
					};
				}}
				class="flex items-center gap-2 pt-2"
			>
				<input type="hidden" name="title" value={title} />
				<input type="hidden" name="poster_path" value={item.poster_path || ''} />
				<Input
					type="text"
					name="name"
					bind:value={newListName}
					placeholder="New list name..."
					class="h-8 text-xs"
					required
				/>
				<Button type="submit" size="sm" class="h-8 text-xs shrink-0" disabled={!newListName.trim()}>
					Create & Add
				</Button>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>