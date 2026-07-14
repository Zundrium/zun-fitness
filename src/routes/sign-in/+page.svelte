<script lang="ts">
	import { goto } from '$app/navigation';
	import { Dumbbell } from '@lucide/svelte';
	import type { PageProps } from './$types';

	import { authClient } from '$lib/auth-client';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Field, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';

	let { data }: PageProps = $props();
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		if (!email || !password) {
			error = 'Email and password are required.';
			return;
		}
		loading = true;
		const result = await authClient.signIn.email({ email, password });
		loading = false;
		if (result.error) {
			error = result.error.message ?? 'Unable to sign in.';
			return;
		}
		await goto(data.redirectTo);
	}
</script>

<svelte:head><title>Sign in · Zun Fitness</title></svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
	<Card class="w-full gap-7 p-6 sm:p-8">
		<div>
			<span class="mb-5 flex size-12 items-center justify-center rounded-3xl bg-(--text) text-(--bg)"><Dumbbell class="size-6" /></span>
			<h1 class="text-2xl font-medium tracking-[-0.04em]">Welcome back</h1>
			<p class="mt-1.5 text-sm text-(--text)/56">Sign in to continue your workout program.</p>
		</div>
		<form class="space-y-5" method="POST" onsubmit={submit}>
			{#if error}<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>{/if}
			<FieldGroup>
				<Field><FieldLabel for="email">Email</FieldLabel><Input id="email" type="email" bind:value={email} autocomplete="email" required /></Field>
				<Field><FieldLabel for="password">Password</FieldLabel><Input id="password" type="password" bind:value={password} autocomplete="current-password" minlength={8} required /></Field>
			</FieldGroup>
			<Button class="w-full" type="submit" disabled={loading}>{#if loading}<Spinner class="mr-2 size-4" />{/if} Sign in</Button>
			<p class="text-center text-sm text-(--text)/56">New here? <a href="/sign-up" class="link font-medium text-(--text)">Create an account</a></p>
		</form>
	</Card>
</main>
