<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { Trash2, Film, ChevronLeft, Edit3, Plus, Search, Star, Heart, ChevronDown } from 'lucide-svelte';

	let { data } = $props();
	const list = $derived(data.list);
	const items = $derived(data.items);

	let isEditModalOpen = $state(false);
let editName = $state('');
	let editDescription = $state('');

	$effect(() => {
		editName = data.list.name;
		editDescription = data.list.description || '';
	});
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let searchTimeout: ReturnType<typeof setTimeout>;

	let formatFilter = $state<'all' | 'movie' | 'tv'>('all');
	let likedOnly = $state(false);
	type SortOption = 'recent' | 'rating-desc' | 'rating-asc' | 'community-desc' | 'popularity-desc' | 'title';
	let sortBy = $state<SortOption>('recent');

	let deleteTarget = $state<{ tmdb_id: number; media_type: string; title: string } | null>(null);

	const filteredItems = $derived.by(() => {
		let result = [...items];

		// Format filter
		if (formatFilter === 'movie') result = result.filter((i: any) => i.media_type === 'movie');
		if (formatFilter === 'tv') result = result.filter((i: any) => i.media_type === 'tv');

		// Liked filter
		if (likedOnly) result = result.filter((i: any) => i.user_liked === 1);

		// Comprehensive Sorting
		if (sortBy === 'rating-desc') {
			result.sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0));
		} else if (sortBy === 'rating-asc') {
			result.sort((a, b) => (a.user_rating || 0) - (b.user_rating || 0));
		} else if (sortBy === 'community-desc') {
			result.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
		} else if (sortBy === 'popularity-desc') {
			result.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
		} else if (sortBy === 'title') {
			result.sort((a, b) => a.title.localeCompare(b.title));
		}

		return result;
	});

	function handleSearchInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		searchQuery = val;
		clearTimeout(searchTimeout);

		if (!val.trim()) {
			searchResults = [];
			return;
		}

		searchTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
				const resData = await res.json();
				searchResults = (resData.results || []).filter(
					(r: any) => r.media_type === 'movie' || r.media_type === 'tv'
				);
			} catch (err) {
				console.error(err);
			}
		}, 300);
	}
</script>

<div class="max-w-6xl mx-auto px-6 py-8 space-y-8">
	<!-- Back Navigation & Header with Progress Bar -->
	<div class="space-y-5 border-b border-border pb-6">
		<Button variant="ghost" size="xs" href="/lists" class="gap-1 text-muted-foreground">
			<ChevronLeft class="w-3.5 h-3.5" />
			Back to Lists
		</Button>

		<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
			<div class="space-y-1.5 flex-1">
				<h1 class="text-3xl font-extrabold tracking-tight text-foreground">{list.name}</h1>
				{#if list.description}
					<p class="text-sm text-muted-foreground max-w-2xl leading-relaxed">{list.description}</p>
				{/if}

				<!-- Progress bar inside list -->
				{#if items.length > 0}
					<div class="space-y-2 pt-2 max-w-md">
						<div class="flex items-center justify-between text-xs font-medium">
							<span class="text-muted-foreground">
								Watched <span class="text-foreground font-semibold">{data.watchedCount}</span> of {items.length} films
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
				{/if}
			</div>

			<Button
				variant="outline"
				size="sm"
				onclick={() => {
					editName = list.name;
					editDescription = list.description || '';
					isEditModalOpen = true;
				}}
				class="gap-1.5 text-xs shrink-0"
			>
				<Edit3 class="w-3.5 h-3.5" />
				Edit List
			</Button>
		</div>
	</div>

	<!-- Controls: Format Tabs on the left, Liked + Sort on the right -->
	<div class="space-y-4">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<!-- Left: Format Tabs -->
			<div class="flex items-center gap-1.5 flex-wrap">
				<Button
					variant={formatFilter === 'all' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => (formatFilter = 'all')}
				>
					All ({items.length})
				</Button>
				<Button
					variant={formatFilter === 'movie' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => (formatFilter = 'movie')}
				>
					Movies
				</Button>
				<Button
					variant={formatFilter === 'tv' ? 'secondary' : 'ghost'}
					size="sm"
					onclick={() => (formatFilter = 'tv')}
				>
					TV Series
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
							<option value="recent">Recently Added</option>
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

		<!-- In-list search input -->
		<div class="relative w-full max-w-sm">
			<Search class="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
			<Input
				type="search"
				placeholder="Add film to list..."
				value={searchQuery}
				oninput={handleSearchInput}
				class="pl-9 h-9 text-xs w-full"
			/>

			{#if searchResults.length > 0}
				<div class="absolute z-30 top-11 left-0 right-0 bg-popover border border-border rounded-lg shadow-xl max-h-72 overflow-y-auto divide-y divide-border">
					{#each searchResults as sItem}
						<form
							method="POST"
							action="?/addItem"
							use:enhance={() => {
								return async ({ update }) => {
									searchQuery = '';
									searchResults = [];
									await update();
								};
							}}
							class="p-2 flex items-center justify-between gap-2 hover:bg-accent/50 transition"
						>
							<input type="hidden" name="tmdb_id" value={sItem.id} />
							<input type="hidden" name="media_type" value={sItem.media_type} />
							<input type="hidden" name="title" value={sItem.title || sItem.name} />
							<input type="hidden" name="poster_path" value={sItem.poster_path || ''} />

							<div class="flex items-center gap-2.5 min-w-0">
								<div class="w-7 h-10 bg-muted rounded overflow-hidden shrink-0">
									{#if sItem.poster_path}
										<img src={`https://image.tmdb.org/t/p/w92${sItem.poster_path}`} alt="" class="w-full h-full object-cover" />
									{/if}
								</div>
								<div class="min-w-0 text-left">
									<p class="text-xs font-semibold truncate text-foreground">{sItem.title || sItem.name}</p>
									<span class="text-[10px] text-muted-foreground uppercase">{sItem.media_type}</span>
								</div>
							</div>

							<Button type="submit" size="xs" variant="secondary" class="gap-1 shrink-0 text-xs">
								<Plus class="w-3 h-3" />
								Add
							</Button>
						</form>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Titles Grid -->
	{#if filteredItems.length > 0}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
			{#each filteredItems as item (item.media_type + '_' + item.tmdb_id)}
				<div class="group relative flex flex-col h-full">
					<a href={`/title/${item.media_type}/${item.tmdb_id}`} class="block h-full">
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

					<!-- Quick Remove Button -->
					<div class="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
						<Button
							type="button"
							variant="destructive"
							size="icon-xs"
							class="rounded-full shadow-md bg-black/75 hover:bg-destructive text-white cursor-pointer"
							title="Remove from list"
							onclick={() => (deleteTarget = { tmdb_id: item.tmdb_id, media_type: item.media_type, title: item.title })}
						>
							<Trash2 class="w-3 h-3" />
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-20 space-y-3">
			<div class="p-4 bg-muted inline-block rounded-full text-muted-foreground">
				<Film class="w-8 h-8" />
			</div>
			<h3 class="text-lg font-semibold">No titles found in this list</h3>
			<p class="text-sm text-muted-foreground max-w-sm mx-auto">
				{#if likedOnly}
					No liked/favorited titles in this list.
				{:else}
					Use the search bar above to quickly add films to this list.
				{/if}
			</p>
		</div>
	{/if}
</div>

<!-- Edit List Modal -->
<Dialog.Root bind:open={isEditModalOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold">Edit List</Dialog.Title>
			<Dialog.Description class="text-xs text-muted-foreground">
				Update your list title or description.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/updateList"
			use:enhance={() => {
				return async ({ update }) => {
					isEditModalOpen = false;
					await update();
				};
			}}
			class="space-y-4 pt-2"
		>
			<div class="space-y-1.5">
				<label for="edit-name" class="text-xs font-semibold text-muted-foreground">Name</label>
				<Input id="edit-name" name="name" bind:value={editName} required />
			</div>

			<div class="space-y-1.5">
				<label for="edit-desc" class="text-xs font-semibold text-muted-foreground">Description</label>
				<textarea
					id="edit-desc"
					name="description"
					bind:value={editDescription}
					rows="3"
					class="w-full rounded-md border border-input bg-card p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
				></textarea>
			</div>

			<Dialog.Footer>
				<Button variant="secondary" onclick={() => (isEditModalOpen = false)}>Cancel</Button>
				<Button type="submit">Save Changes</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Remove Item Confirmation Modal -->
<Dialog.Root open={!!deleteTarget} onOpenChange={(open) => { if (!open) deleteTarget = null; }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold">Remove Title</Dialog.Title>
			<Dialog.Description class="text-xs text-muted-foreground">
				Remove <span class="font-semibold text-foreground">{deleteTarget?.title}</span> from this list?
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="gap-2 sm:gap-0 pt-2">
			<Button variant="secondary" onclick={() => (deleteTarget = null)}>Cancel</Button>
			<form
				method="POST"
				action="?/removeItem"
				use:enhance={() => {
					return async ({ update }) => {
						deleteTarget = null;
						await update();
					};
				}}
			>
				<input type="hidden" name="tmdb_id" value={deleteTarget?.tmdb_id} />
				<input type="hidden" name="media_type" value={deleteTarget?.media_type} />
				<Button type="submit" variant="destructive">Remove</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>