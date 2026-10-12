<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Film, Search, ListOrdered, Star } from 'lucide-svelte';
	import { page } from '$app/state';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: 'Search', icon: Search, match: (p: string) => p === '/' },
		{ href: '/library', label: 'Library', icon: Film, match: (p: string) => p.startsWith('/library') },
		{ href: '/lists', label: 'Lists', icon: ListOrdered, match: (p: string) => p.startsWith('/lists') },
		{ href: '/live-list', label: 'Live List', icon: Star, match: (p: string) => p.startsWith('/live-list') }
	];
</script>

<ModeWatcher defaultMode="dark" />

<div class="min-h-screen bg-background text-foreground antialiased flex flex-col dark pb-16 sm:pb-0">
	<!-- Top Header: Hidden on mobile, visible on desktop -->
	<header class="hidden sm:block border-b border-border bg-card/75 backdrop-blur sticky top-0 z-30 px-6 py-3">
		<div class="max-w-6xl mx-auto flex items-center justify-between">
			<a href="/" class="text-xl font-bold tracking-tight text-foreground hover:opacity-80 transition">
				CineLog
			</a>

			<nav class="flex items-center gap-1.5">
				{#each navItems as item}
					<Button
						variant={item.match(page.url.pathname) ? 'secondary' : 'ghost'}
						size="sm"
						href={item.href}
						class="gap-1.5 text-xs"
					>
						<item.icon class="w-3.5 h-3.5" />
						{item.label}
					</Button>
				{/each}
			</nav>
		</div>
	</header>

	<!-- Content Area with Safe-Area Top Padding for mobile notch -->
	<div class="flex-1 pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-0">
		{@render children()}
	</div>

	<!-- Mobile Bottom Navigation Bar -->
	<nav class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-md border-t border-border px-3 py-1.5 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg">
		{#each navItems as item}
			{@const active = item.match(page.url.pathname)}
			<a
				href={item.href}
				class="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors {active ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}"
			>
				<item.icon class="w-4 h-4 mb-1 {active ? 'stroke-[2.5]' : 'stroke-2'}" />
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</div>