<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { CalendarDays, KeyRound, LogOut, Mail, UserRound } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';

	import { authClient } from '$lib/auth-client';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Field, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';

	let { data }: PageProps = $props();
	let name = $state(untrack(() => data.profileUser.name));
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let profileError = $state('');
	let profileMessage = $state('');
	let passwordError = $state('');
	let passwordMessage = $state('');
	let savingProfile = $state(false);
	let savingPassword = $state(false);

	async function updateProfile(event: SubmitEvent) {
		event.preventDefault();
		profileError = '';
		profileMessage = '';
		if (name.trim().length < 2) {
			profileError = 'Name must be at least 2 characters.';
			return;
		}
		savingProfile = true;
		const result = await authClient.updateUser({ name: name.trim() });
		savingProfile = false;
		if (result.error) {
			profileError = result.error.message ?? 'Unable to update profile.';
			return;
		}
		profileMessage = 'Profile updated.';
		await invalidateAll();
	}

	async function changePassword(event: SubmitEvent) {
		event.preventDefault();
		passwordError = '';
		passwordMessage = '';
		if (currentPassword.length < 8 || newPassword.length < 8) {
			passwordError = 'Passwords must be at least 8 characters.';
			return;
		}
		if (newPassword !== confirmPassword) {
			passwordError = 'Passwords do not match.';
			return;
		}
		savingPassword = true;
		const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
		savingPassword = false;
		if (result.error) {
			passwordError = result.error.message ?? 'Unable to change password.';
			return;
		}
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
		passwordMessage = 'Password changed.';
	}

	async function signOut() {
		await authClient.signOut();
		await goto('/sign-in');
	}
</script>

<svelte:head><title>Profile · Zun Fitness</title></svelte:head>

<main class="mx-auto grid max-w-5xl gap-5 px-4 py-10 md:grid-cols-[300px_1fr] md:px-6">
	<Card class="h-fit items-center text-center">
		<Avatar src={data.profileUser.image ?? undefined} alt={data.profileUser.name} size="xl" />
		<div><h1 class="text-xl font-medium">{data.profileUser.name}</h1><p class="text-sm text-(--text)/40">{data.profileUser.email}</p></div>
		<div class="w-full space-y-3 text-left text-sm text-(--text)/56">
			<div class="flex items-center gap-2"><Mail class="size-4" /> {data.profileUser.email}</div>
			<div class="flex items-center gap-2"><CalendarDays class="size-4" /> Joined {new Date(data.profileUser.createdAt).toLocaleDateString()}</div>
		</div>
		<Button variant="ghost" class="w-full" onclick={signOut}><LogOut class="mr-2 size-4" /> Sign out</Button>
	</Card>

	<div class="space-y-5">
		<Card>
			<div><h2 class="flex items-center gap-2 text-xl font-medium"><UserRound class="size-5" /> Profile</h2><p class="mt-1 text-sm text-(--text)/56">Update your account name.</p></div>
			<form class="space-y-5" onsubmit={updateProfile}>
				{#if profileError}<Alert variant="destructive"><AlertDescription>{profileError}</AlertDescription></Alert>{/if}
				{#if profileMessage}<Alert class="text-emerald-700 dark:text-emerald-300"><AlertDescription>{profileMessage}</AlertDescription></Alert>{/if}
				<Field><FieldLabel for="profile-name">Name</FieldLabel><Input id="profile-name" bind:value={name} required minlength={2} /></Field>
				<Button type="submit" disabled={savingProfile}>{#if savingProfile}<Spinner class="mr-2 size-4" />{/if} Save profile</Button>
			</form>
		</Card>

		<Card id="password">
			<div><h2 class="flex items-center gap-2 text-xl font-medium"><KeyRound class="size-5" /> Change password</h2><p class="mt-1 text-sm text-(--text)/56">Update your password and revoke other sessions.</p></div>
			<form class="space-y-5" onsubmit={changePassword}>
				{#if passwordError}<Alert variant="destructive"><AlertDescription>{passwordError}</AlertDescription></Alert>{/if}
				{#if passwordMessage}<Alert class="text-emerald-700 dark:text-emerald-300"><AlertDescription>{passwordMessage}</AlertDescription></Alert>{/if}
				<FieldGroup>
					<Field><FieldLabel for="current-password">Current password</FieldLabel><Input id="current-password" type="password" bind:value={currentPassword} autocomplete="current-password" required minlength={8} /></Field>
					<Field><FieldLabel for="new-password">New password</FieldLabel><Input id="new-password" type="password" bind:value={newPassword} autocomplete="new-password" required minlength={8} /></Field>
					<Field><FieldLabel for="confirm-password">Confirm password</FieldLabel><Input id="confirm-password" type="password" bind:value={confirmPassword} autocomplete="new-password" required minlength={8} /></Field>
				</FieldGroup>
				<Button type="submit" disabled={savingPassword}>{#if savingPassword}<Spinner class="mr-2 size-4" />{/if} Change password</Button>
			</form>
		</Card>
	</div>
</main>
