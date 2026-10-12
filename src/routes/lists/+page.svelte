<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { enhance } from '$app/forms';
	import { Plus, ListOrdered, Trash2 } from 'lucide-svelte';

	let { data } = $props();
	let isCreateModalOpen = $state(false);
	let name = $state('');
	let description = $state('');

	// State for delete confirmation modal
	let deleteTarget = $state<{ id: string; name: string } | null>(null);
</script>

<div class="max-w-6xl mx-auto px-6 py-8 space-y-8">
	<!-- Page Header -->
	<div class="flex items-center justify-between border-b border-border pb-5">
		<div>
			<h1 class="text-3xl font-extrabold tracking-tight text-foreground">Your Lists</h1>
			<p class="text-sm text-muted-foreground mt-1">
				Curate personal collections, rankings, and marathons.
			</p>
		</div>

		<Button onclick={() => (isCreateModalOpen = true)} class="gap-1.5 text-xs">
			<Plus class="w-4 h-4" />
			New List
		</Button>
	</div>

	<!-- 2-Column Lists Grid (Info on TOP, Posters on BOTTOM) -->
	{#if data.lists && data.lists.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each data.lists as list (list.id)}
				<div class="group relative rounded-2xl border border-border bg-card p-5 hover:border-foreground/30 transition flex flex-col justify-between space-y-4">
					<a href={`/lists/${list.id}`} class="block space-y-4 flex-1">
						<!-- TOP: Title + ALL Badge + Description + Entry Count -->
						<div class="space-y-1.5 px-1">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2 flex-wrap">
									<h3 class="font-bold text-base text-foreground group-hover:underline truncate max-w-[80%]">
										{list.name}
									</h3>
									<Badge variant="outline" class="text-[10px] uppercase font-semibold px-1.5 py-0.5 border-border/70 text-muted-foreground">
										ALL
									</Badge>
								</div>
							</div>

							{#if list.description}
								<p class="text-xs text-muted-foreground line-clamp-2 max-w-md">
									{list.description}
								</p>
							{/if}

							<p class="text-xs text-muted-foreground pt-0.5 font-medium">
								{list.item_count} {list.item_count === 1 ? 'entry' : 'entries'} • Created {new Date(list.created_at).toLocaleDateString()}
							</p>
						</div>

						<!-- BOTTOM: 5 Connected/Overlapping Poster Slots -->
						<div class="p-3 rounded-xl bg-muted/20 border border-border/40 overflow-hidden">
							<div class="flex items-center -space-x-1.5">
								{#each Array(5) as _, i}
									{@const posterPath = list.posters?.[i]}
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

					<!-- Trash Button (Cleanly placed at the bottom) -->
					<div class="flex justify-end pt-1 border-t border-border/40">
						<Button
							type="button"
							variant="ghost"
							size="xs"
							class="text-muted-foreground/50 hover:text-destructive gap-1 text-xs cursor-pointer"
							onclick={() => (deleteTarget = { id: list.id, name: list.name })}
						>
							<Trash2 class="w-3.5 h-3.5" />
							Delete List
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-20 space-y-3">
			<div class="p-4 bg-muted inline-block rounded-full text-muted-foreground">
				<ListOrdered class="w-8 h-8" />
			</div>
			<h3 class="text-lg font-semibold">No lists created yet</h3>
			<p class="text-sm text-muted-foreground max-w-sm mx-auto">
				Group your favorite movies by director, theme, or franchise.
			</p>
			<Button onclick={() => (isCreateModalOpen = true)} variant="outline" size="sm" class="gap-1.5">
				<Plus class="w-4 h-4" />
				Create Your First List
			</Button>
		</div>
	{/if}
</div>

<!-- Universal Delete Confirmation Modal for Lists -->
<Dialog.Root open={!!deleteTarget} onOpenChange={(open) => { if (!open) deleteTarget = null; }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold">Delete Custom List</Dialog.Title>
			<Dialog.Description class="text-xs text-muted-foreground">
				Are you sure you want to delete <span class="font-semibold text-foreground">{deleteTarget?.name}</span>? All entries in this list will be removed.
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer class="gap-2 sm:gap-0 pt-2">
			<Button variant="secondary" onclick={() => (deleteTarget = null)}>Cancel</Button>
			<form
				method="POST"
				action="?/deleteList"
				use:enhance={() => {
					return async ({ update }) => {
						deleteTarget = null;
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={deleteTarget?.id} />
				<Button type="submit" variant="destructive">Delete</Button>
			</form>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Create List Modal -->
<Dialog.Root bind:open={isCreateModalOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-lg font-bold">Create New List</Dialog.Title>
			<Dialog.Description class="text-xs text-muted-foreground">
				Give your list a name and optional description.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/createList"
			use:enhance={() => {
				return async ({ update }) => {
					isCreateModalOpen = false;
					name = '';
					description = '';
					await update();
				};
			}}
			class="space-y-4 pt-2"
		>
			<div class="space-y-1.5">
				<label for="list-name" class="text-xs font-semibold text-muted-foreground">Name</label>
				<Input id="list-name" name="name" bind:value={name} placeholder="e.g. Watching, Top 10 Sci-Fi" required />
			</div>

			<div class="space-y-1.5">
				<label for="list-desc" class="text-xs font-semibold text-muted-foreground">Description (Optional)</label>
				<textarea
					id="list-desc"
					name="description"
					bind:value={description}
					placeholder="What is this list about?"
					rows="3"
					class="w-full rounded-md border border-input bg-card p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
				></textarea>
			</div>

			<Dialog.Footer>
				<Button variant="secondary" onclick={() => (isCreateModalOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={!name.trim()}>Create List</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>