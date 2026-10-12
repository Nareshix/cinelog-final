<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { Heart, Trash2, Film, Plus, ChevronDown } from 'lucide-svelte';

	let {
		filterType = 'all',
		logs = []
	}: {
		filterType: 'all' | 'watched' | 'watchlist' | 'liked';
		logs: any[];
	} = $props();

	type SortOption = 'recent' | 'rating-desc' | 'rating-asc' | 'community-desc' | 'popularity-desc' | 'title';
	let sortBy = $state<SortOption>('recent');
	let likedOnly = $state(false);

	let deleteTarget = $state<{ id: string; title: string } | null>(null);

	const processedLogs = $derived.by(() => {
		let list = [...logs];

		if (filterType === 'watched') list = list.filter((i) => i.watched === 1);
		if (filterType === 'watchlist') list = list.filter((i) => i.watchlist === 1);
		if (filterType === 'liked') list = list.filter((i) => i.liked === 1);

		if (likedOnly) {
			list = list.filter((i) => i.liked === 1);
		}

		if (sortBy === 'rating-desc') {
			list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
		} else if (sortBy === 'rating-asc') {
			list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
		} else if (sortBy === 'community-desc') {
			list.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
		} else if (sortBy === 'popularity-desc') {
			list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
		} else if (sortBy === 'title') {
			list.sort((a, b) => a.title.localeCompare(b.title));
		} else {
			list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
		}

		return list;
	});
</script>

<div class="space-y-5">
	<!-- Top Controls: Responsive for Mobile -->
	<div class="flex items-center justify-between gap-2.5 flex-wrap">
		<Button
			variant={likedOnly ? 'secondary' : 'ghost'}
			size="xs"
			onclick={() => (likedOnly = !likedOnly)}
			class="gap-1.5 text-xs cursor-pointer {likedOnly ? 'border border-rose-500/30' : ''}"
		>
			<Heart class="w-3.5 h-3.5 {likedOnly ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}" />
			Liked Only
		</Button>

		<div class="flex items-center gap-1.5">
			<span class="text-xs text-muted-foreground font-medium hidden sm:inline">Sort:</span>
			<div class="relative inline-flex items-center">
				<select
					bind:value={sortBy}
					class="appearance-none bg-card border border-input rounded-md pl-2.5 pr-7 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer max-w-[150px] sm:max-w-none"
				>
					<option value="recent">Recently Updated</option>
					<option value="rating-desc">My Rating: High to Low</option>
					<option value="rating-asc">My Rating: Low to High</option>
					<option value="community-desc">Highest Community</option>
					<option value="popularity-desc">Most Popular</option>
					<option value="title">A-Z</option>
				</select>
				<ChevronDown class="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
			</div>
		</div>
	</div>

	<!-- Titles Grid -->
	{#if processedLogs.length > 0}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
			{#each processedLogs as item (item.id)}
				<div class="group relative flex flex-col h-full">
					<a href={`/title/${item.media_type}/${item.tmdb_id}`} class="flex flex-col h-full">
						<Card.Root class="overflow-hidden transition hover:border-foreground/30 flex flex-col h-full bg-card border-border pt-0 gap-0">
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
										No Poster Available
									</div>
								{/if}
							</div>

							<Card.Content class="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-2">
								<h3 class="font-semibold text-xs sm:text-sm line-clamp-1 group-hover:underline text-foreground" title={item.title}>
									{item.title}
								</h3>

								<div class="flex items-center justify-between text-xs pt-0.5">
									<div class="flex items-center gap-1 flex-wrap">
										<Badge variant="outline" class="text-[9px] sm:text-[10px] uppercase font-medium">
											{item.media_type === 'movie' ? 'Film' : 'TV'}
										</Badge>
										{#if item.watched === 1}
											<Badge variant="outline" class="text-[9px] sm:text-[10px] text-emerald-500 border-emerald-500/30">
												Watched
											</Badge>
										{/if}
									</div>

									<div class="flex items-center gap-1 shrink-0">
										{#if item.rating > 0}
											<span class="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
												★ {item.rating}
											</span>
										{/if}
										{#if item.liked === 1}
											<Heart class="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
										{/if}
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					</a>

					<!-- Quick Delete Button (Visible on mobile touch & desktop hover) -->
					<div class="absolute top-2 left-2 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
						<Button
							type="button"
							variant="destructive"
							size="icon-xs"
							class="rounded-full shadow-md bg-black/75 hover:bg-destructive text-white cursor-pointer touch-manipulation"
							title="Remove from library"
							onclick={() => (deleteTarget = { id: item.id, title: item.title })}
						>
							<Trash2 class="w-3 h-3" />
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-16 space-y-3">
			<div class="p-4 bg-muted inline-block rounded-full text-muted-foreground">
				<Film class="w-8 h-8" />
			</div>
			<h3 class="text-lg font-semibold">No titles found</h3>
			<p class="text-sm text-muted-foreground max-w-sm mx-auto">
				{#if likedOnly}
					You haven't liked any titles in this list yet.
				{:else if filterType === 'watched'}
					You haven't marked any films or shows as watched yet.
				{:else if filterType === 'watchlist'}
					Your watchlist is currently empty.
				{:else}
					Your library is empty. Go search to add your first movie!
				{/if}
			</p>
			<Button href="/" variant="outline" size="sm" class="gap-1.5">
				<Plus class="w-4 h-4" />
				Search Titles
			</Button>
		</div>
	{/if}
</div>

<Dialog.Root open={!!deleteTarget} onOpenChange={(open) => { if (!open) deleteTarget = null; }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold">Remove from Library</Dialog.Title>
			<Dialog.Description class="text-xs text-muted-foreground">
				Are you sure you want to remove <span class="font-semibold text-foreground">{deleteTarget?.title}</span> and its ratings/notes from your database?
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="gap-2 sm:gap-0 pt-2">
			<Button variant="secondary" onclick={() => (deleteTarget = null)}>Cancel</Button>
			<form
				method="POST"
				action="/library?/deleteLog"
				use:enhance={() => {
					return async ({ update }) => {
						deleteTarget = null;
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={deleteTarget?.id} />
				<Button type="submit" variant="destructive">Remove</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>