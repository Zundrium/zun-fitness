<script lang="ts">
    import { cubicOut } from "svelte/easing";
    import { fade } from "svelte/transition";
    import WorkoutSession from "./WorkoutSession.svelte";
    import SessionControlButton from "./SessionControlButton.svelte";

    export let workout: {
        day: number;
        image_url: string;
        title: string;
        description: string;
    } | null = null;
    export let isCompleted: boolean = false;
    export let onClose: () => void;
    export let onToggleComplete: () => void;

    let isSessionActive = false;
    let workoutData: any = null;

    // Dynamically load workout data when workout changes
    $: if (workout) {
        loadWorkoutData(workout.day);
    }

    async function loadWorkoutData(day: number) {
        try {
            const paddedDay = String(day).padStart(2, "0");
            const module = await import(
                `../data/workouts/day${paddedDay}.json`
            );
            workoutData = module.default;
        } catch (error) {
            console.error(`Failed to load workout data for day ${day}:`, error);
        }
    }

    let clickSound: HTMLAudioElement | null = null;
    let closeSound: HTMLAudioElement | null = null;

    function playClick() {
        if (!clickSound) {
            clickSound = new Audio("/audio/click.mp3");
        }
        clickSound.currentTime = 0;
        clickSound
            .play()
            .catch((e) => console.error("Error playing click sound:", e));
    }

    function playClose() {
        if (!closeSound) {
            closeSound = new Audio("/audio/close.mp3");
        }
        closeSound.currentTime = 0;
        closeSound
            .play()
            .catch((e) => console.error("Error playing close sound:", e));
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            if (isSessionActive) {
                // Confirm abort? For now just close
                isSessionActive = false;
            } else {
                onClose();
            }
        }
    }

    function startSession() {
        isSessionActive = true;
    }

    function handleSessionComplete() {
        isSessionActive = false;
        if (!isCompleted) {
            onToggleComplete();
        }
        // Maybe show a completion screen first? For now just close back to modal
    }

    function handleSessionCancel() {
        isSessionActive = false;
    }

    function glitch(node: Element, { duration = 200 }) {
        return {
            duration,
            css: (t: number, u: number) => {
                const eased = cubicOut(t);

                return `
                    opacity: ${t};
                    transform: scale(${0.8 + 0.2 * eased});
                    clip-path: inset(${u * 45}% 0 ${u * 45}% 0);
                    filter: brightness(${1 + u * 2}) contrast(${1 + u});
                `;
            },
        };
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if workout}
    <div
        class="backdrop"
        on:click={onClose}
        transition:fade={{ duration: 150 }}
    >
        <div
            class="modal {isSessionActive ? '' : 'mech-border'}"
            class:session-active={isSessionActive}
            on:click|stopPropagation
            transition:glitch={{ duration: 200 }}
        >
            {#if isSessionActive && workoutData}
                <WorkoutSession
                    {workoutData}
                    onComplete={handleSessionComplete}
                    onCancel={handleSessionCancel}
                />
            {:else}
                <div
                    class="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-40"
                ></div>

                <button
                    class="close-btn"
                    on:click={() => {
                        playClose();
                        onClose();
                    }}
                >
                    <span class="sr-only">Close</span>
                    ✕
                </button>

                <div class="content">
                    <div class="header-section">
                        <div
                            class="text-[var(--color-dim)] text-xs font-mono tracking-widest mb-1"
                        >
                            MISSION.OBJECTIVE.{workout.day}
                        </div>
                        <h2
                            class="text-glow glitch-title"
                            data-text={workout.title}
                        >
                            {workout.title}
                        </h2>
                    </div>

                    <div class="image-container relative group">
                        <img
                            src={workout.image_url}
                            alt={workout.title}
                            class="opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                        />
                        <!-- Scanline overlay -->
                        <div
                            class="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,243,255,0.1)_50%)] bg-[length:100%_4px] pointer-events-none"
                        ></div>
                        <div
                            class="absolute inset-0 border border-[var(--color-primary)] opacity-20"
                        ></div>
                    </div>

                    {#if workout.description}
                        <div
                            class="bg-[var(--color-bg)] p-4 border-l-2 border-[var(--color-dim)]"
                        >
                            <p class="font-mono text-sm">
                                {workout.description}
                            </p>
                        </div>
                    {/if}

                    {#if isCompleted}
                        <div class="flex gap-4 mt-4">
                            <button
                                class="action-btn completed flex-1 flex items-center justify-center gap-2"
                                on:click={() => {
                                    playClick();
                                    onToggleComplete();
                                }}
                            >
                                <span class="text-black">MISSION COMPLETE</span>
                                <span class="text-black font-bold">✓</span>
                            </button>
                            <button
                                class="action-btn flex-1 flex items-center justify-center gap-2"
                                on:click={() => {
                                    playClick();
                                    startSession();
                                }}
                            >
                                <span>REDO</span>
                                <span>↻</span>
                            </button>
                        </div>
                    {:else}
                        <SessionControlButton
                            variant="skip"
                            onClick={() => {
                                playClick();
                                startSession();
                            }}
                        >
                            INITIATE PROTOCOL
                        </SessionControlButton>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(5, 8, 21, 0.9);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100;
        padding: 1rem;
        box-sizing: border-box;
    }

    .modal {
        padding: 2rem;
        width: 100%;
        position: relative;
        box-shadow: 0 0 50px rgba(0, 243, 255, 0.12);
        transition: max-width 0.3s ease;
    }

    .modal.session-active {
        max-width: 100vw;
        width: 100vw;
        height: 100vh;
        padding: 0;
        border: none;
        display: flex;
        flex-direction: column;
        background: var(--color-bg);
    }

    .close-btn {
        position: absolute;
        top: 1rem;
        right: 1rem;
        font-size: 1.5rem;
        color: var(--color-dim);
        line-height: 1;
        padding: 0.5rem;
        transition: all 0.2s;
        z-index: 10;
    }

    .close-btn:hover {
        color: var(--color-primary);
        text-shadow: 0 0 10px var(--color-primary);
        transform: rotate(90deg);
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .image-container {
        width: 100%;
        border-radius: 0;
        overflow: hidden;
        background: var(--color-bg);
        border: 1px solid var(--color-border);
    }

    img {
        width: 100%;
        height: auto;
        display: block;
        filter: grayscale(20%) contrast(120%);
    }

    h2 {
        color: var(--color-primary);
        font-size: 1.8rem;
        margin: 0;
    }

    p {
        color: var(--color-text);
        line-height: 1.6;
    }

    .action-btn {
        position: relative;
        background: transparent;
        border: 1px solid var(--color-primary);
        color: var(--color-primary);
        padding: 1rem;
        font-family: var(--font-display);
        font-weight: 700;
        font-size: 1.1rem;
        transition: all 0.3s;
        margin-top: 1rem;
        overflow: hidden;
        letter-spacing: 0.1em;
        clip-path: polygon(
            10px 0,
            100% 0,
            100% calc(100% - 10px),
            calc(100% - 10px) 100%,
            0 100%,
            0 10px
        );
    }

    .action-btn:hover {
        box-shadow: 0 0 20px rgba(0, 243, 255, 0.3);
        color: #000;
    }

    .action-btn.completed {
        background: var(--color-primary);
        color: #000;
        border-color: var(--color-primary);
        box-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
    }

    .action-btn-initiate {
        background: var(--color-primary);
        color: var(--color-bg);
        border-color: var(--color-primary);
        box-shadow: 0 0 20px rgba(0, 247, 255, 0.4);
    }

    .action-btn-initiate:hover {
        color: var(--color-bg);
        box-shadow: 0 0 28px rgba(0, 247, 255, 0.7);
    }
</style>
