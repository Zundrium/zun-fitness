<script lang="ts">
	import { Dumbbell } from '@lucide/svelte';

	import MusicPlayer from '$lib/components/MusicPlayer.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { AuthUser } from '$lib/server/auth';
	import ThemeToggle from './ThemeToggle.svelte';
	import UserMenu from './UserMenu.svelte';

	let { user }: { user: AuthUser | null | undefined } = $props();
</script>

<header class="sticky top-0 z-50 border-b border-(--text)/8 bg-(--bg)/90 backdrop-blur-xl">
	<nav class="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center gap-x-3 px-4 sm:px-6 md:flex-nowrap">
		<Button href="/" variant="ghost" class="order-1 shrink-0 gap-2 px-2" aria-label="Zun Fitness home">
			<span class="flex size-8 items-center justify-center rounded-2xl bg-(--text) text-(--bg)"><Dumbbell class="size-4" /></span>
			<span class="font-medium">Zun Fitness</span>
		</Button>

		{#if user}
			<div class="order-3 w-full border-t border-(--text)/6 py-2 md:order-2 md:min-w-0 md:flex-1 md:border-0 md:py-0">
				<MusicPlayer class="mx-auto max-w-lg" />
			</div>
		{/if}

		<div class="order-2 ml-auto flex shrink-0 items-center gap-1 md:order-3">
			<ThemeToggle />
			<UserMenu {user} />
		</div>
	</nav>
</header>
