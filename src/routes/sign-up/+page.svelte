<script lang="ts">
	import { goto } from '$app/navigation';
	import { Dumbbell } from '@lucide/svelte';

	import { authClient } from '$lib/auth-client';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Field, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		if (name.trim().length < 2) {
			error = 'Name must be at least 2 characters.';
			return;
		}
		if (password.length < 8) {
			error = 'Password must be at least 8 characters.';
			return;
		}
		if (password !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}
		loading = true;
		const result = await authClient.signUp.email({ name: name.trim(), email, password });
		loading = false;
		if (result.error) {
			error = result.error.message ?? 'Unable to create your account.';
			return;
		}
		await goto('/');
	}
</script>

<svelte:head><title>Create account · Zun Fitness</title></svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
	<Card class="w-full gap-7 p-6 sm:p-8">
		<div>
			<span class="mb-5 flex size-12 items-center justify-center rounded-3xl bg-(--text) text-(--bg)"><Dumbbell class="size-6" /></span>
			<h1 class="text-2xl font-medium tracking-[-0.04em]">Start your program</h1>
			<p class="mt-1.5 text-sm text-(--text)/56">Your progress and rep cadence settings sync to your account.</p>
		</div>
		<form class="space-y-5" method="POST" onsubmit={submit}>
			{#if error}<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>{/if}
			<FieldGroup>
				<Field><FieldLabel for="name">Name</FieldLabel><Input id="name" bind:value={name} autocomplete="name" minlength={2} required /></Field>
				<Field><FieldLabel for="email">Email</FieldLabel><Input id="email" type="email" bind:value={email} autocomplete="email" required /></Field>
				<Field><FieldLabel for="password">Password</FieldLabel><Input id="password" type="password" bind:value={password} autocomplete="new-password" minlength={8} required /></Field>
				<Field><FieldLabel for="confirm-password">Confirm password</FieldLabel><Input id="confirm-password" type="password" bind:value={confirmPassword} autocomplete="new-password" minlength={8} required /></Field>
			</FieldGroup>
			<Button class="w-full" type="submit" disabled={loading}>{#if loading}<Spinner class="mr-2 size-4" />{/if} Create account</Button>
			<p class="text-center text-sm text-(--text)/56">Already have an account? <a href="/sign-in" class="link font-medium text-(--text)">Sign in</a></p>
		</form>
	</Card>
</main>
