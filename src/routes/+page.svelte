<script lang="ts">
    import { onMount } from "svelte";
    import Clock from "$lib/components/Clock.svelte";
    import Calendar from "$lib/components/Calendar.svelte";
    import WorkoutModal from "$lib/components/WorkoutModal.svelte";
    import workoutsData from "$lib/data/workouts.json";
    import { audioService } from "$lib/services/audio";

    let completedDays: string[] = [];
    let selectedWorkout: any = null;
    let selectedDateKey: string | null = null;
    let isSelectedDayCompleted = false;

    let overlayPhase: "loading" | "split" | "done" = "loading";
    let hasBoundWelcomeBackListener = false;

    const WELCOME_SOUND = "/audio/voice/heart/welcome-back.mp3";

    onMount(() => {
        const stored = localStorage.getItem("completedDays");
        if (stored) {
            completedDays = JSON.parse(stored);
        }

        audioService.preload([WELCOME_SOUND]);

        setTimeout(() => {
            overlayPhase = "split";
            if (!hasBoundWelcomeBackListener) {
                const tryPlayWelcomeBack = () => {
                    audioService
                        .play(WELCOME_SOUND)
                        .catch((e) =>
                            console.error(
                                "Error playing welcome-back sound:",
                                e,
                            ),
                        );

                    window.removeEventListener("click", tryPlayWelcomeBack);
                    window.removeEventListener("keydown", tryPlayWelcomeBack);
                };

                window.addEventListener("click", tryPlayWelcomeBack, {
                    once: true,
                });
                window.addEventListener("keydown", tryPlayWelcomeBack, {
                    once: true,
                });
                hasBoundWelcomeBackListener = true;
            }
            setTimeout(() => {
                overlayPhase = "done";
            }, 800);
        }, 2000);
    });

    function saveCompletedDays() {
        localStorage.setItem("completedDays", JSON.stringify(completedDays));
    }

    function handleDayClick(detail: { day: number; dateKey: string }) {
        const { day, dateKey } = detail;
        selectedDateKey = dateKey;
        isSelectedDayCompleted = completedDays.includes(dateKey);

        if (day === 31) {
            selectedWorkout = {
                day: 31,
                title: "SYSTEM RECHARGE",
                description:
                    "Protocol: Rest and Recovery. Allow systems to cool down.",
                image_url:
                    "https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?auto=format&fit=crop&w=800&q=80", // Placeholder for rest
            };
        } else {
            // Find workout for the day. Data is 1-based index matching day number.
            // workoutsData[0] is Day 1.
            // So workoutsData[day - 1] should be correct.
            // Let's verify bounds.
            if (day >= 1 && day <= 30) {
                selectedWorkout = workoutsData[day - 1];
            } else {
                // Fallback or error
                selectedWorkout = null;
            }
        }
    }

    function closeModal() {
        selectedWorkout = null;
        selectedDateKey = null;
    }

    function toggleComplete() {
        if (!selectedDateKey) return;

        if (isSelectedDayCompleted) {
            completedDays = completedDays.filter((d) => d !== selectedDateKey);
            isSelectedDayCompleted = false;
        } else {
            completedDays = [...completedDays, selectedDateKey];
            isSelectedDayCompleted = true;
        }
        saveCompletedDays();
    }
</script>

{#if overlayPhase !== "done"}
    <div class="loading-overlay">
        <div
            class="loading-split loading-split--top {overlayPhase === 'split'
                ? 'loading-split--animate-top'
                : ''}"
        ></div>
        <div
            class="loading-split loading-split--bottom {overlayPhase === 'split'
                ? 'loading-split--animate-bottom'
                : ''}"
        ></div>

        <div
            class="loading-content {overlayPhase === 'split'
                ? 'loading-content--fade'
                : ''}"
        >
            <div class="loading-label">INITIALIZING.SYSTEMS</div>
        </div>
    </div>
{/if}

<main
    class="min-h-screen p-8 md:p-16 flex flex-col items-center justify-center relative"
>
    <!-- Mainframe Container -->

    <!-- Header Line -->
    <div
        class="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-30"
    ></div>

    <div class="relative z-10">
        <Clock />

        <div class="calendar-wrapper mt-8">
            <Calendar {completedDays} ondayclick={handleDayClick} />
        </div>
    </div>

    <WorkoutModal
        workout={selectedWorkout}
        isCompleted={isSelectedDayCompleted}
        onClose={closeModal}
        onToggleComplete={toggleComplete}
    />

    <!-- Background Grid Animation (CSS only) -->
    <div class="fixed inset-0 pointer-events-none z-[-1]">
        <div
            class="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.05)_1px,transparent_1px)] bg-grid-main [transform:perspective(500px)_rotateX(60deg)_translateY(-100px)_scale(2)]"
        ></div>
    </div>
</main>

<style>
    .calendar-wrapper {
        width: 100%;
        display: flex;
        justify-content: center;
    }

    .loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        background: var(--color-bg);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .loading-split {
        position: absolute;
        left: 0;
        width: 100%;
        background: #000;
        transition: transform 0.7s cubic-bezier(0.19, 1, 0.22, 1);
    }

    .loading-split--top {
        top: 0;
        height: 50%;
        transform: translateY(0);
    }

    .loading-split--bottom {
        bottom: 0;
        height: 50%;
        transform: translateY(0);
    }

    .loading-split--animate-top {
        transform: translateY(-100%);
    }

    .loading-split--animate-bottom {
        transform: translateY(100%);
    }

    .loading-content {
        position: relative;
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
    }

    .loading-content--fade {
        opacity: 0;
        transition: opacity 0.4s ease-out;
    }

    .loading-label {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        color: var(--color-dim);
    }
</style>
