<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { enhance } from '$app/forms';
	import { Star, Building2, User, Trash2 } from 'lucide-svelte';

	let { data } = $props();

	type FilterType = 'all' | 'person' | 'company';
	let activeFilter = $state<FilterType>('all');

	// State for delete confirmation modal
	let deleteTarget = $state<{ id: string; name: string } | null>(null);

	const filteredEntities = $derived.by(() => {
		if (activeFilter === 'person') return data.entities.filter((e) => e.type === 'person');
		if (activeFilter === 'company') return data.entities.filter((e) => e.type === 'company');
		return data.entities;
	});
</script>

<div class="max-w-6xl mx-auto px-6 py-8 space-y-8">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
		<div>
			<h1 class="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
				<Star />
				Live Lists
			</h1>
			<p class="text-sm text-muted-foreground mt-1">
				Auto-updating catalogues of your favorite artists & studios with live completion tracking.
			</p>
		</div>

		<!-- Filter Tabs -->
		<div class="flex items-center gap-1.5">
			<Button
				variant={activeFilter === 'all' ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (activeFilter = 'all')}
			>
				All ({data.entities.length})
			</Button>
			<Button
				variant={activeFilter === 'person' ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (activeFilter = 'person')}
			>
				People
			</Button>
			<Button
				variant={activeFilter === 'company' ? 'secondary' : 'ghost'}
				size="sm"
				onclick={() => (activeFilter = 'company')}
			>
				Studios
			</Button>
		</div>
	</div>

	<!-- 2-Column Live Lists Grid (Info on TOP, Posters on BOTTOM) -->
	{#if filteredEntities.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each filteredEntities as entity (entity.id)}
				{@const href = `/live-list/${entity.type}/${entity.tmdb_id}`}
				<div class="group relative rounded-2xl border border-border bg-card p-5 hover:border-foreground/30 transition flex flex-col justify-between space-y-4">
					<a {href} class="block space-y-4 flex-1">
						<!-- TOP: Person Photo / Studio Logo + Name + Badge + Progress Bar -->
						<div class="space-y-3 px-1">
							<div class="flex items-center gap-3">
								<div class="w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0 border border-border/60 flex items-center justify-center">
									{#if entity.image_path}
										<img
											src={`https://image.tmdb.org/t/p/w185${entity.image_path}`}
											alt={entity.name}
											class="w-full h-full object-cover {entity.type === 'company' ? 'object-contain p-1.5 filter brightness-90' : ''}"
										/>
									{:else if entity.type === 'company'}
										<Building2 class="w-6 h-6 text-muted-foreground/60" />
									{:else}
										<User class="w-6 h-6 text-muted-foreground/60" />
									{/if}
								</div>

								<div class="space-y-0.5 min-w-0 flex-1">
									<div class="flex items-center gap-2 flex-wrap">
										<h3 class="font-bold text-base text-foreground group-hover:underline truncate max-w-[75%]">
											{entity.name}
										</h3>
										<Badge variant="outline" class="text-[10px] uppercase font-semibold px-1.5 py-0.5 border-border/70 text-muted-foreground">
											{entity.type === 'person' ? (entity.subtitle || 'Artist') : 'Studio'}
										</Badge>
									</div>
									<p class="text-xs text-muted-foreground font-medium">
										{entity.item_count} entries • Live catalogue
									</p>
								</div>
							</div>

							<!-- Dynamic Progress Bar -->
							<div class="space-y-1.5 pt-1">
								<div class="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
									<span>Watched {entity.watched_count} of {entity.item_count}</span>
									<span class="font-semibold text-foreground">{entity.percentage}%</span>
								</div>
								<div class="w-full bg-muted/60 rounded-full h-2 overflow-hidden border border-border/40">
									<div
										class="bg-primary h-full rounded-full transition-all duration-300"
										style="width: {entity.percentage}%"
									></div>
								</div>
							</div>
						</div>

						<!-- BOTTOM: 5 Connected/Overlapping Film Posters -->
						<div class="p-3 rounded-xl bg-muted/20 border border-border/40 overflow-hidden">
							<div class="flex items-center -space-x-1.5">
								{#each Array(5) as _, i}
									{@const posterPath = entity.posters?.[i]}
									<div
										class="flex-1 aspect-2/3 rounded-lg overflow-hidden border border-border/50 bg-muted/40 relative shadow-xs"
										style="z-index: {10 - i};"
									>
										{#if posterPath}
											<img
												src={`https://image.tmdb.org/t/p/w185${posterPath}`}
												alt=""
												class="w-full h-full object-cover"
												loading="lazy"
											/>
										{:else}
											<div class="w-full h-full bg-background/30"></div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</a>

					<!-- Trash Button (Positioned below the progress bar and cards with breathing room) -->
					<div class="flex justify-end pt-1 border-t border-border/40">
						<Button
							type="button"
							variant="ghost"
							size="xs"
							class="text-muted-foreground/50 hover:text-destructive gap-1 text-xs cursor-pointer"
							onclick={() => (deleteTarget = { id: entity.id, name: entity.name })}
						>
							<Trash2 class="w-3.5 h-3.5" />
							Remove Live List
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-20 space-y-3">
			<div class="p-4 bg-muted inline-block rounded-full text-muted-foreground">
				<Star class="w-8 h-8" />
			</div>
			<h3 class="text-lg font-semibold">No live lists yet</h3>
			<p class="text-sm text-muted-foreground max-w-sm mx-auto">
				Click "Star Artist" or "Star Studio" on any director, actor, or company page to track their live catalogue.
			</p>
			<Button href="/" variant="outline" size="sm">Search Artists & Studios</Button>
		</div>
	{/if}
</div>

<!-- Universal Delete Confirmation Modal for Live Lists -->
<Dialog.Root open={!!deleteTarget} onOpenChange={(open) => { if (!open) deleteTarget = null; }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold">Remove Live List</Dialog.Title>
			<Dialog.Description class="text-xs text-muted-foreground">
				Are you sure you want to stop tracking <span class="font-semibold text-foreground">{deleteTarget?.name}</span>? You can star them again at any time.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="gap-2 sm:gap-0 pt-2">
			<Button variant="secondary" onclick={() => (deleteTarget = null)}>Cancel</Button>
			<form
				method="POST"
				action="?/unstar"
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