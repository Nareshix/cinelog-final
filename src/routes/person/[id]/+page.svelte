<script lang="ts">
	import { enhance } from "$app/forms";

	import { Badge } from "#lib/components/ui/badge/index.js";
	import { Button } from "#lib/components/ui/button/index.js";
	import {
		Star,
		MapPin,
		Calendar,
		ExternalLink,
		ChevronDown,
	} from "lucide-svelte";

	let { data } = $props();
	const person = $derived(data.person);

	type DeptType = "all" | "acting" | "directing" | "writing" | "production";
	type MediaType = "all" | "movie" | "tv";
	type SortType = "date-desc" | "date-asc" | "rating" | "popularity";

	function getInitialDept(): DeptType {
		const d = (data.person.known_for_department || "").toLowerCase();
		if (d.includes("direct")) return "directing";
		if (d.includes("act")) return "acting";
		if (d.includes("writ")) return "writing";
		if (d.includes("produc")) return "production";
		return "all";
	}

	let activeDept = $state<DeptType>(getInitialDept());
	let activeMedia = $state<MediaType>("all");
	let sortBy = $state<SortType>("date-desc");
	let showFullBio = $state(false);
	let isUpcomingExpanded = $state(false);
	let visibleCount = $state(30);

	// Exclude Talk (10767), News (10763), Reality (10764), and Documentary (99)
	const EXCLUDED_GENRES = new Set([10767, 10763, 10764, 99]);

	// 1. Clean and deduplicate all credits
	const cleanCredits = $derived.by(() => {
		const cast = (person.combined_credits?.cast || []).map((c: any) => ({
			...c,
			department: "acting",
			roleTitle: c.character || "Actor",
		}));

		const crew = (person.combined_credits?.crew || []).map((c: any) => ({
			...c,
			department: (c.department || "crew").toLowerCase(),
			roleTitle: c.job || c.department || "Crew",
		}));

		const map = new Map<string, any>();

		for (const item of [...cast, ...crew]) {
			if (
				item.genre_ids &&
				item.genre_ids.some((id: number) => EXCLUDED_GENRES.has(id))
			) {
				continue;
			}

			const roleLower = (item.roleTitle || "").toLowerCase();

			// Discard "Self"
			const isSelfRole =
				roleLower.startsWith("self") ||
				roleLower.includes("himself") ||
				roleLower.includes("herself") ||
				roleLower.includes("themselves") ||
				roleLower.includes("interviewee") ||
				roleLower.includes("guest host") ||
				roleLower.includes("special guest");
			if (isSelfRole) continue;

			// Discard Archive Footage
			const isArchiveFootage =
				roleLower.includes("archive footage") ||
				roleLower.includes("archival footage") ||
				roleLower.includes("archive sound") ||
				roleLower.includes("stock footage") ||
				roleLower.includes("(archive)");
			if (isArchiveFootage) continue;

			const key = `${item.media_type}_${item.id}`;
			const role = item.roleTitle.trim();

			if (!map.has(key)) {
				map.set(key, {
					...item,
					roles: role ? [role] : [],
					departments: new Set([item.department]),
				});
			} else {
				const existing = map.get(key)!;
				if (role && !existing.roles.includes(role)) {
					existing.roles.push(role);
				}
				if (item.department) {
					existing.departments.add(item.department);
				}
			}
		}

		return Array.from(map.values());
	});

	function isUpcoming(item: any): boolean {
		const date = item.release_date || item.first_air_date;
		if (!date || date.trim() === "") return true;
		const today = new Date().toISOString().split("T")[0];
		return date > today;
	}

	const scopedCredits = $derived.by(() => {
		return cleanCredits.filter((item) => {
			if (activeDept !== "all" && !item.departments.has(activeDept))
				return false;
			if (activeMedia !== "all" && item.media_type !== activeMedia)
				return false;
			return true;
		});
	});

	const upcomingCredits = $derived.by(() => {
		return scopedCredits.filter((item) => isUpcoming(item));
	});

	const releasedCredits = $derived.by(() => {
		let list = scopedCredits.filter((item) => !isUpcoming(item));

		list.sort((a, b) => {
			if (sortBy === "rating") {
				return (b.vote_average || 0) - (a.vote_average || 0);
			}
			if (sortBy === "popularity") {
				return (b.popularity || 0) - (a.popularity || 0);
			}
			const dateA = a.release_date || a.first_air_date || "";
			const dateB = b.release_date || b.first_air_date || "";
			if (sortBy === "date-asc") {
				return dateA.localeCompare(dateB);
			}
			return dateB.localeCompare(dateA);
		});

		return list;
	});

	const availableDepts = $derived.by(() => {
		const set = new Set<string>();
		for (const c of cleanCredits) {
			c.departments.forEach((d: string) => set.add(d));
		}
		return set;
	});

	const deptCounts = $derived.by(() => ({
		acting: cleanCredits.filter((c) => c.departments.has("acting")).length,
		directing: cleanCredits.filter((c) => c.departments.has("directing"))
			.length,
		writing: cleanCredits.filter((c) => c.departments.has("writing"))
			.length,
		production: cleanCredits.filter((c) => c.departments.has("production"))
			.length,
	}));

	const mediaCounts = $derived.by(() => {
		const scoped =
			activeDept === "all"
				? cleanCredits
				: cleanCredits.filter((c) => c.departments.has(activeDept));

		return {
			movie: scoped.filter((c) => c.media_type === "movie").length,
			tv: scoped.filter((c) => c.media_type === "tv").length,
		};
	});

	const knownForTitles = $derived.by(() => {
		const dept = (person.known_for_department || "Acting").toLowerCase();

		const scored = cleanCredits
			.filter((item) => !isUpcoming(item))
			.filter((item) => {
				if (!item.poster_path) return false;

				if (dept.includes("act")) {
					if (!item.departments.has("acting")) return false;
					if (typeof item.order === "number" && item.order >= 10)
						return false;
				} else if (dept.includes("direct")) {
					const hasDirecting = (item.roles || []).some(
						(r: string) => r.toLowerCase() === "director",
					);
					if (!hasDirecting) return false;
				} else if (dept.includes("writ")) {
					const hasWriting = (item.roles || []).some((r: string) => {
						const lower = r.toLowerCase();
						return (
							lower.includes("writer") ||
							lower.includes("screenplay") ||
							lower.includes("story")
						);
					});
					if (!hasWriting) return false;
				}

				return (item.vote_count ?? 0) >= 30;
			})
			.map((item) => {
				const voteCount = item.vote_count || 0;
				const voteAvg = item.vote_average || 0;
				const score = voteCount * Math.pow(voteAvg / 10, 1.5);
				return { ...item, _score: score };
			})
			.sort((a, b) => b._score - a._score);

		if (scored.length < 4) {
			return cleanCredits
				.filter((item) => !isUpcoming(item) && item.poster_path)
				.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
				.slice(0, 8);
		}

		return scored.slice(0, 8);
	});

	const displayedReleasedCredits = $derived(
		releasedCredits.slice(0, visibleCount),
	);
	const imdbId = $derived(person.external_ids?.imdb_id);
</script>

<div class="max-w-6xl mx-auto px-6 py-10 space-y-12">
	<!-- Top Person Profile Header -->
	<div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
		<div class="md:col-span-3">
			<div
				class="w-32 h-44 sm:w-44 sm:h-60 md:w-full md:h-auto md:aspect-2/3 mx-auto md:mx-0 rounded-xl overflow-hidden bg-muted border border-border shadow-sm"
			>
				{#if person.profile_path}
					<img
						src={`https://image.tmdb.org/t/p/h632${person.profile_path}`}
						alt={person.name}
						class="w-full h-full object-cover"
					/>
				{:else}
					<div
						class="w-full h-full flex items-center justify-center text-muted-foreground text-sm"
					>
						No Photo
					</div>
				{/if}
			</div>
		</div>

		<div class="md:col-span-9 space-y-4">
			<div>
				<div class="flex items-center gap-3">
					<h1
						class="text-3xl sm:text-5xl font-black tracking-tight text-foreground"
					>
						{person.name}
					</h1>

					<!-- Live Star/Follow Button -->
					<form method="POST" action="?/toggleStar" use:enhance>
						<input type="hidden" name="name" value={person.name} />
						<input
							type="hidden"
							name="image_path"
							value={person.profile_path || ""}
						/>
						<input
							type="hidden"
							name="subtitle"
							value={person.known_for_department || "Artist"}
						/>
						<input
							type="hidden"
							name="is_starred"
							value={data.isStarred.toString()}
						/>
						<Button
							type="submit"
							variant={data.isStarred ? "secondary" : "outline"}
							size="sm"
							class="gap-1.5 text-xs cursor-pointer"
						>
							<Star
								class="w-3.5 h-3.5 {data.isStarred
									? 'fill-amber-400 text-amber-400'
									: 'text-muted-foreground'}"
							/>
							{data.isStarred ? "Starred" : "Star Artist"}
						</Button>
					</form>
				</div>
				<div
					class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2 font-medium"
				>
					{#if person.known_for_department}
						<Badge
							variant="secondary"
							class="uppercase text-[11px] font-semibold"
						>
							{person.known_for_department}
						</Badge>
					{/if}
					{#if person.birthday}
						<span class="flex items-center gap-1">
							<Calendar class="w-3.5 h-3.5" />
							{person.birthday}{person.deathday
								? ` — ${person.deathday}`
								: ""}
						</span>
					{/if}
					{#if person.place_of_birth}
						<span class="flex items-center gap-1">
							<MapPin class="w-3.5 h-3.5" />
							{person.place_of_birth}
						</span>
					{/if}
				</div>
			</div>

			<!-- Bio -->
			{#if person.biography}
				<div
					class="text-sm leading-relaxed text-muted-foreground max-w-3xl space-y-2"
				>
					<p class={showFullBio ? "" : "line-clamp-4"}>
						{person.biography}
					</p>
					{#if person.biography.length > 320}
						<button
							type="button"
							onclick={() => (showFullBio = !showFullBio)}
							class="text-xs text-foreground font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
						>
							{showFullBio ? "Show less" : "Read more"}
						</button>
					{/if}
				</div>
			{/if}

			<!-- External Links -->
			<div class="flex items-center gap-2 pt-2">
				{#if imdbId}
					<a
						href={`https://www.imdb.com/name/${imdbId}`}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1 bg-card hover:bg-accent transition"
					>
						IMDb <ExternalLink class="w-3 h-3" />
					</a>
				{/if}
				<a
					href={`https://www.themoviedb.org/person/${person.id}`}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1 bg-card hover:bg-accent transition"
				>
					TMDB <ExternalLink class="w-3 h-3" />
				</a>
			</div>
		</div>
	</div>

	<!-- Known For Section -->
	{#if knownForTitles.length > 0}
		<div class="space-y-4">
			<h2 class="text-xl font-bold tracking-tight text-foreground">
				Known For
			</h2>
			<div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
				{#each knownForTitles as kItem}
					<a
						href={`/title/${kItem.media_type}/${kItem.id}`}
						class="group space-y-1.5 block"
					>
						<div
							class="aspect-2/3 rounded-lg overflow-hidden bg-muted border border-border shadow-xs group-hover:ring-2 group-hover:ring-primary transition"
						>
							<img
								src={`https://image.tmdb.org/t/p/w342${kItem.poster_path}`}
								alt={kItem.title || kItem.name}
								class="w-full h-full object-cover group-hover:scale-105 transition-transform"
								loading="lazy"
							/>
						</div>
						<p
							class="text-xs font-semibold text-foreground truncate group-hover:underline"
							title={kItem.title || kItem.name}
						>
							{kItem.title || kItem.name}
						</p>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Filmography Header & Dual Controls -->
	<div class="space-y-6 pt-2">
		<div class="space-y-4 border-b border-border pb-4">
			<!-- Row 1: Title, Role Tabs & Sort Dropdown -->
			<div
				class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
			>
				<h2 class="text-2xl font-bold tracking-tight text-foreground">
					Filmography <span
						class="text-sm text-muted-foreground font-normal"
						>({scopedCredits.length})</span
					>
				</h2>

				<div class="flex flex-wrap items-center gap-3">
					<!-- Role Tabs -->
					<div
						class="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0 sm:flex-wrap pb-1"
					>
						<Button
							variant={activeDept === "all"
								? "secondary"
								: "ghost"}
							size="sm"
							class="shrink-0"
							onclick={() => {
								activeDept = "all";
								visibleCount = 30;
							}}
						>
							All
						</Button>
						{#if availableDepts.has("acting")}
							<Button
								variant={activeDept === "acting"
									? "secondary"
									: "ghost"}
								size="sm"
								onclick={() => {
									activeDept = "acting";
									visibleCount = 30;
								}}
							>
								Acting ({deptCounts.acting})
							</Button>
						{/if}
						{#if availableDepts.has("directing")}
							<Button
								variant={activeDept === "directing"
									? "secondary"
									: "ghost"}
								size="sm"
								onclick={() => {
									activeDept = "directing";
									visibleCount = 30;
								}}
							>
								Directing ({deptCounts.directing})
							</Button>
						{/if}
						{#if availableDepts.has("writing")}
							<Button
								variant={activeDept === "writing"
									? "secondary"
									: "ghost"}
								size="sm"
								onclick={() => {
									activeDept = "writing";
									visibleCount = 30;
								}}
							>
								Writing ({deptCounts.writing})
							</Button>
						{/if}
						{#if availableDepts.has("production")}
							<Button
								variant={activeDept === "production"
									? "secondary"
									: "ghost"}
								size="sm"
								onclick={() => {
									activeDept = "production";
									visibleCount = 30;
								}}
							>
								Production ({deptCounts.production})
							</Button>
						{/if}
					</div>

					<!-- Sort Dropdown (Defaults to Newest First) -->
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-muted-foreground">Sort:</span>
						<select
							bind:value={sortBy}
							class="bg-card border border-input rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
						>
							<option value="date-desc">Newest First</option>
							<option value="date-asc">Oldest First</option>
							<option value="rating">Highest Rated</option>
							<option value="popularity">Most Popular</option>
						</select>
					</div>
				</div>
			</div>

			<!-- Row 2: Format Filter (Movies vs TV) -->
			<div class="flex items-center gap-2 pt-1">
				<span class="text-xs text-muted-foreground font-medium"
					>Format:</span
				>
				<div class="flex items-center gap-1">
					<Button
						variant={activeMedia === "all" ? "secondary" : "ghost"}
						size="xs"
						onclick={() => {
							activeMedia = "all";
							visibleCount = 30;
						}}
					>
						All Formats
					</Button>
					<Button
						variant={activeMedia === "movie"
							? "secondary"
							: "ghost"}
						size="xs"
						onclick={() => {
							activeMedia = "movie";
							visibleCount = 30;
						}}
					>
						Movies ({mediaCounts.movie})
					</Button>
					<Button
						variant={activeMedia === "tv" ? "secondary" : "ghost"}
						size="xs"
						onclick={() => {
							activeMedia = "tv";
							visibleCount = 30;
						}}
					>
						TV Series ({mediaCounts.tv})
					</Button>
				</div>
			</div>
		</div>

		<!-- INLINE EXPANDABLE: Upcoming & In Development (Default Closed) -->
		{#if upcomingCredits.length > 0}
			<div
				class="rounded-xl border border-border bg-card/60 overflow-hidden transition-all"
			>
				<button
					type="button"
					onclick={() => (isUpcomingExpanded = !isUpcomingExpanded)}
					class="w-full flex items-center justify-between p-3.5 hover:bg-accent/40 transition cursor-pointer text-left select-none"
				>
					<div class="flex items-center gap-2.5">
						<Badge
							variant="outline"
							class="border-amber-500/40 text-amber-500 uppercase text-[10px] tracking-wider font-semibold"
						>
							Upcoming & In Development
						</Badge>
						<span class="text-xs font-medium text-foreground">
							{upcomingCredits.length}
							{upcomingCredits.length === 1
								? "project"
								: "projects"} announced
						</span>
					</div>
					<div
						class="flex items-center gap-1.5 text-xs text-muted-foreground font-medium"
					>
						<span>{isUpcomingExpanded ? "Hide" : "Show"}</span>
						<ChevronDown
							class="w-4 h-4 transition-transform duration-200 {isUpcomingExpanded
								? 'rotate-180'
								: ''}"
						/>
					</div>
				</button>

				{#if isUpcomingExpanded}
					<div
						class="divide-y divide-border border-t border-border px-4 sm:px-5 bg-background/50"
					>
						{#each upcomingCredits as item}
							{@const year =
								(
									item.release_date ||
									item.first_air_date ||
									""
								).split("-")[0] || "TBA"}
							<div
								class="py-3.5 flex items-center justify-between gap-4"
							>
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
												loading="lazy"
											/>
										{:else}
											<div
												class="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground text-center"
											>
												TBA
											</div>
										{/if}
									</a>
									<div class="min-w-0 space-y-0.5">
										<div
											class="flex items-center gap-2 flex-wrap"
										>
											<a
												href={`/title/${item.media_type}/${item.id}`}
												class="font-semibold text-sm hover:underline text-foreground truncate"
											>
												{item.title || item.name}
											</a>
											<Badge
												variant="outline"
												class="text-[10px] uppercase font-medium"
											>
												{item.media_type === "movie"
													? "Film"
													: "TV"}
											</Badge>
										</div>
										<p
											class="text-xs text-muted-foreground truncate"
											title={item.roles.join(", ")}
										>
											{item.roles.join(" • ")}
										</p>
									</div>
								</div>
								<Badge
									variant="secondary"
									class="text-xs font-semibold shrink-0"
								>
									{year}
								</Badge>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Released Filmography List (With 5-Star scale rating and balanced right spacing) -->
		<div class="divide-y divide-border border-y border-border">
			{#each displayedReleasedCredits as item (item.media_type + "_" + item.id)}
				{@const year =
					(item.release_date || item.first_air_date || "").split(
						"-",
					)[0] || "—"}
				<div
					class="py-3.5 px-3 sm:px-5 flex items-center justify-between gap-4 hover:bg-card/60 transition rounded-lg"
				>
					<!-- Poster + Title + Merged Roles -->
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
								<div
									class="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground text-center"
								>
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
								<Badge
									variant="outline"
									class="text-[10px] uppercase font-medium"
								>
									{item.media_type === "movie"
										? "Film"
										: "TV"}
								</Badge>
							</div>

							<!-- Merged Roles -->
							{#if item.roles && item.roles.length > 0}
								<p
									class="text-xs text-muted-foreground truncate"
									title={item.roles.join(", ")}
								>
									{item.roles.join(" • ")}
								</p>
							{/if}
						</div>
					</div>

					<!-- Year + Rating on the right (Divided by 2 with spacious right padding) -->
					<div
						class="flex items-center gap-5 sm:gap-6 shrink-0 text-right pr-1 sm:pr-3"
					>
						<span class="text-xs text-muted-foreground font-medium"
							>{year}</span
						>
						<div class="flex items-center gap-1.5 w-14 justify-end">
							{#if item.vote_average && item.vote_average > 0}
								<Star
									class="w-3.5 h-3.5 fill-amber-400 text-amber-400"
								/>
								<span
									class="text-xs font-semibold text-foreground"
								>
									{(item.vote_average / 2).toFixed(1)}
								</span>
							{:else}
								<span class="text-xs text-muted-foreground/60"
									>—</span
								>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Pagination / Show More for Released Titles -->
		{#if visibleCount < releasedCredits.length}
			<div class="pt-4 flex justify-center">
				<Button
					variant="outline"
					size="sm"
					onclick={() => (visibleCount += 40)}
					class="gap-1.5"
				>
					<ChevronDown class="w-4 h-4" />
					Show More ({visibleCount} of {releasedCredits.length})
				</Button>
			</div>
		{/if}
	</div>
</div>
