<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';

	import Calendar from '$lib/components/Calendar.svelte';
	import Clock from '$lib/components/Clock.svelte';
	import WorkoutModal from '$lib/components/WorkoutModal.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { audioService } from '$lib/services/audio';
	import type { Workout } from '$lib/workouts/types';

	let { data }: PageProps = $props();
	let completedDateKeys = $state(
		untrack(() => new Set<string>(data.completedDays.map((day) => day.dateKey)))
	);
	let savingDateKeys = $state(new Set<string>());
	let selectedWorkout = $state<Workout | null>(null);
	let selectedDateKey = $state<string | null>(null);
	let exerciseSpeeds = $state(
		untrack(
			() =>
				Object.fromEntries(
					data.program.workouts.flatMap((workout) =>
						workout.activities.flatMap((activity) =>
							activity.type === 'reps'
								? [[activity.exerciseId, activity.speedPercent] as const]
								: []
						)
					)
				) as Record<number, number>
		)
	);
	let errorMessage = $state('');

	const selectedWorkoutWithSpeeds = $derived<Workout | null>(
		selectedWorkout
			? {
					...selectedWorkout,
					activities: selectedWorkout.activities.map((activity) =>
						activity.type === 'reps'
							? {
									...activity,
									speedPercent:
										exerciseSpeeds[activity.exerciseId] ?? activity.speedPercent
								}
							: activity
					)
				}
			: null
	);
	const CLICK_SOUND = '/audio/click.m4a';

	function handleDayClick({ day, dateKey }: { day: number; dateKey: string }) {
		void audioService.play(CLICK_SOUND);
		selectedWorkout = data.program.workouts.find((workout) => workout.day === day) ?? null;
		selectedDateKey = selectedWorkout ? dateKey : null;
	}

	function closeWorkout() {
		selectedWorkout = null;
		selectedDateKey = null;
	}

	function handleSpeedChange(exerciseId: number, speedPercent: number) {
		exerciseSpeeds = { ...exerciseSpeeds, [exerciseId]: speedPercent };
	}

	async function toggleComplete(workoutId: number, dateKey: string) {
		if (savingDateKeys.has(dateKey)) return;
		errorMessage = '';
		const wasCompleted = completedDateKeys.has(dateKey);
		const nextCompleted = new Set(completedDateKeys);
		if (wasCompleted) nextCompleted.delete(dateKey);
		else nextCompleted.add(dateKey);
		completedDateKeys = nextCompleted;
		savingDateKeys = new Set(savingDateKeys).add(dateKey);

		const response = await fetch(
			wasCompleted
				? `/api/progress/${workoutId}?date=${encodeURIComponent(dateKey)}`
				: `/api/progress/${workoutId}`,
			{
				method: wasCompleted ? 'DELETE' : 'PUT',
				headers: wasCompleted ? undefined : { 'content-type': 'application/json' },
				body: wasCompleted ? undefined : JSON.stringify({ completedDate: dateKey })
			}
		);
		const nextSaving = new Set(savingDateKeys);
		nextSaving.delete(dateKey);
		savingDateKeys = nextSaving;

		if (!response.ok) {
			const reverted = new Set(completedDateKeys);
			if (wasCompleted) reverted.add(dateKey);
			else reverted.delete(dateKey);
			completedDateKeys = reverted;
			errorMessage = 'Your progress could not be saved. Please try again.';
		}
	}
</script>

<svelte:head><title>{data.program.name} · Zun Fitness</title></svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-7rem)] max-w-2xl flex-col items-center justify-center px-4 py-10 sm:px-6">
	<div class="w-full">
		<Clock />

		<div class="mt-10 w-full">
			<Calendar completedDateKeys={[...completedDateKeys]} ondayclick={handleDayClick} />
		</div>

		{#if errorMessage}
			<Alert variant="destructive" class="mx-auto mt-4 max-w-sm">
				<AlertDescription>{errorMessage}</AlertDescription>
			</Alert>
		{/if}
	</div>
</main>

{#if selectedWorkoutWithSpeeds && selectedDateKey}
	<WorkoutModal
		workout={selectedWorkoutWithSpeeds}
		completed={completedDateKeys.has(selectedDateKey)}
		saving={savingDateKeys.has(selectedDateKey)}
		onclose={closeWorkout}
		ontoggle={() => toggleComplete(selectedWorkoutWithSpeeds!.id, selectedDateKey!)}
		onspeedchange={handleSpeedChange}
	/>
{/if}
