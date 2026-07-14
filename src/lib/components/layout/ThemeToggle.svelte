<script lang="ts">
	import { Moon, Sun } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';

	let isDark = $state(false);
	onMount(() => {
		isDark = document.documentElement.classList.contains('dark');
	});

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		try {
			localStorage.setItem('zun-fitness-theme', isDark ? 'dark' : 'light');
		} catch {
			// Theme persistence is optional.
		}
	}
</script>

<Button variant="ghost" size="icon" onclick={toggleTheme} aria-label="Toggle theme">
	{#if isDark}<Sun class="size-4" />{:else}<Moon class="size-4" />{/if}
</Button>
