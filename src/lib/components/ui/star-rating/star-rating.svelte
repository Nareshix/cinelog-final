<script lang="ts">
	import { Star, X } from 'lucide-svelte';
	import { cn } from '#lib/utils.js';

	let {
		value = $bindable(0),
		max = 5,
		disabled = false,
		readonly = false,
		class: className,
		onValueChange
	}: {
		value?: number;
		max?: number;
		disabled?: boolean;
		readonly?: boolean;
		class?: string;
		onValueChange?: (val: number) => void;
	} = $props();

	let hovered = $state<number | null>(null);
	let starsWrapperRef = $state<HTMLDivElement | null>(null);

	function calculateRating(e: MouseEvent, starIndex: number): number {
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const isLeftHalf = e.clientX - rect.left < rect.width / 2;
		return isLeftHalf ? starIndex - 0.5 : starIndex;
	}

	function handleMouseMove(e: MouseEvent, starIndex: number) {
		if (disabled || readonly) return;
		hovered = calculateRating(e, starIndex);
	}

	function handleClick(e: MouseEvent, starIndex: number) {
		if (disabled || readonly) return;
		const clickedVal = calculateRating(e, starIndex);
		const next = value === clickedVal ? 0 : clickedVal;
		value = next;
		hovered = null; // Instantly clears ghost hover
		onValueChange?.(next);
	}

	function calculateTouchRating(e: TouchEvent): number {
		if (!starsWrapperRef) return 0;
		const rect = starsWrapperRef.getBoundingClientRect();
		const touch = e.touches[0] || e.changedTouches[0];
		if (!touch) return 0;

		const x = touch.clientX - rect.left;
		const clampX = Math.max(0, Math.min(rect.width, x));
		const raw = (clampX / rect.width) * max;
		const snapped = Math.ceil(raw * 2) / 2;
		return Math.max(0.5, Math.min(max, snapped));
	}

	function handleTouchStart(e: TouchEvent) {
		if (disabled || readonly) return;
		hovered = calculateTouchRating(e);
	}

	function handleTouchMove(e: TouchEvent) {
		if (disabled || readonly) return;
		if (e.cancelable) e.preventDefault();
		hovered = calculateTouchRating(e);
	}

	function handleTouchEnd(e: TouchEvent) {
		if (disabled || readonly) return;
		const touchVal = hovered ?? calculateTouchRating(e);
		const next = value === touchVal ? 0 : touchVal;
		value = next;
		hovered = null; // Instantly clears touch preview
		onValueChange?.(next);
	}

	function clearRating() {
		if (disabled || readonly) return;
		value = 0;
		hovered = null;
		onValueChange?.(0);
	}
</script>

<div
	class={cn(
		'relative inline-flex items-center select-none',
		disabled && 'opacity-50 cursor-not-allowed',
		className
	)}
	role="radiogroup"
	aria-label="Star rating"
>
	<div
		bind:this={starsWrapperRef}
		class="inline-flex items-center gap-1.5 touch-none"
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		ontouchcancel={() => (hovered = null)}
	>
		{#each Array.from({ length: max }, (_, i) => i + 1) as star}
			{@const activeRating = hovered ?? value}
			{@const isFull = activeRating >= star}
			{@const isHalf = activeRating === star - 0.5}

			<button
				type="button"
				role="radio"
				aria-checked={value === star || value === star - 0.5}
				tabindex={disabled ? -1 : 0}
				disabled={disabled || readonly}
				onmousemove={(e) => handleMouseMove(e, star)}
				onmouseleave={() => { if (!disabled && !readonly) hovered = null; }}
				onclick={(e) => handleClick(e, star)}
				class="relative size-7 flex items-center justify-center p-0 rounded-none cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-manipulation border-none bg-transparent"
				aria-label="Rate {star} stars"
			>
				<Star class="size-7 fill-muted-foreground/20 stroke-none" />

				{#if isFull}
					<Star class="absolute inset-0 size-7 fill-amber-400 stroke-none pointer-events-none" />
				{:else if isHalf}
					<div class="absolute inset-0 w-1/2 overflow-hidden pointer-events-none">
						<Star class="size-7 max-w-none fill-amber-400 stroke-none" />
					</div>
				{/if}
			</button>
		{/each}
	</div>

	{#if value > 0 && !readonly && !disabled}
		<div
			class="absolute left-full top-1/2 -translate-y-1/2 pl-2.5 flex items-center gap-1.5 pointer-events-auto"
		>
			<div class="h-3.5 w-px bg-border/80"></div>
			<button
				type="button"
				onclick={clearRating}
				class="text-muted-foreground/70 hover:text-foreground transition p-1 rounded-full cursor-pointer touch-manipulation flex items-center justify-center"
				title="Clear rating"
				aria-label="Clear rating"
			>
				<X class="w-3.5 h-3.5" />
			</button>
		</div>
	{/if}
</div>