<script lang="ts">
	import type { LayoutProps } from './$types';
	import Header from '$lib/components/layout/Header.svelte';
	import './layout.css';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>Zun Fitness</title>
	<meta name="description" content="A personal 30-day workout program with synced progress and rep cadence settings." />
	<link rel="icon" href="/favicon.ico" sizes="any" />
</svelte:head>

<Header user={data.user} />
{@render children()}
