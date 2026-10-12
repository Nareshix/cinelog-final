<script lang="ts">
	import LibraryView from '../LibraryView.svelte';
	let { data } = $props();
</script>

<LibraryView filterType="liked" logs={data.logs} />