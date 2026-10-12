<script lang="ts">
	import LibraryView from './LibraryView.svelte';
	let { data } = $props();
</script>

<LibraryView filterType="all" logs={data.logs} />