<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Gauge, KeyRound, LogOut, UserRound } from '@lucide/svelte';

	import { authClient } from '$lib/auth-client';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import type { AuthUser } from '$lib/server/auth';

	let { user }: { user: AuthUser | null | undefined } = $props();
	const session = authClient.useSession();
	const clientUser = $derived($session.data?.user as AuthUser | undefined);
	const currentUser = $derived(clientUser ?? user ?? null);
	const pending = $derived($session.isPending && !user);

	async function signOut() {
		await authClient.signOut();
		await invalidateAll();
		await goto('/sign-in');
	}
</script>

{#if pending}
	<Button variant="ghost" disabled>Loading…</Button>
{:else if !currentUser}
	<div class="flex items-center gap-1">
		<Button variant="ghost" href="/sign-in">Sign in</Button>
		<Button href="/sign-up" class="hidden sm:inline-flex">Create account</Button>
	</div>
{:else}
	<DropdownMenu>
		<DropdownMenuTrigger>
			{#snippet child({ props })}
				<Button variant="ghost" size="icon" {...props} aria-label="Open user menu">
					<Avatar src={currentUser.image ?? undefined} alt={currentUser.name || currentUser.email} size="sm" />
				</Button>
			{/snippet}
		</DropdownMenuTrigger>
		<DropdownMenuContent class="w-64">
			<DropdownMenuLabel>
				<p class="truncate font-medium">{currentUser.name}</p>
				<p class="truncate text-xs font-normal text-(--text)/40">{currentUser.email}</p>
			</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuItem onclick={() => goto('/profile')}><UserRound /> Profile</DropdownMenuItem>
			<DropdownMenuItem onclick={() => goto('/profile#password')}><KeyRound /> Change password</DropdownMenuItem>
			<DropdownMenuItem onclick={() => goto('/exercises')}><Gauge /> Rep speeds</DropdownMenuItem>
			<DropdownMenuSeparator />
			<DropdownMenuItem variant="destructive" onclick={signOut}><LogOut /> Sign out</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
{/if}
