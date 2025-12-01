<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fade, fly } from "svelte/transition";
    import SessionControlButton from "./SessionControlButton.svelte";
    import { audioService } from "../services/audio";

    export let workoutData: any;
    export let onComplete: () => void;
    export let onCancel: () => void;

    let currentSet = 1;
    let currentActivityIndex = 0;
    let isResting = false;
    let isSetup = true;
    let isIntro = false;
    let timeLeft = 0;
    let timerInterval: any;
    let isPaused = false;

    let isStepTransitioning = false;

    let isRepBased = false;

    // Screen Wake Lock to keep screen on during workout
    let wakeLock: any = null;

    $: currentActivity = workoutData.activities[currentActivityIndex];
    $: totalActivities = workoutData.activities.length;
    let totalSets = workoutData.sets;

    // Generate image path from activity name
    $: displayActivity = isIntro
        ? workoutData.activities[0] // During intro, show first activity
        : isResting
          ? currentActivityIndex >= totalActivities - 1
              ? workoutData.activities[0] // Last activity completed, next is first
              : workoutData.activities[currentActivityIndex + 1] // Next activity
          : currentActivity; // During activity, show current

    $: activityImagePath = `/activities/${displayActivity.name.toLowerCase().replace(/ /g, "-")}.webp`;

    // Progress Bar Logic
    $: activityReps = currentActivity.reps || currentActivity.count || 0;
    $: currentTotalTime = isIntro
        ? 10
        : isResting
          ? currentActivityIndex >= totalActivities - 1 &&
            currentSet < totalSets
              ? workoutData.restBetweenSets || 60
              : workoutData.restBetweenActivities
          : isRepBased
            ? activityReps * 2
            : currentActivity.duration;

    $: progressPercentage =
        ((currentTotalTime - timeLeft) / currentTotalTime) * 100;

    // Rep Counter Logic
    $: currentRep = isRepBased
        ? Math.min(
              Math.floor((currentTotalTime - timeLeft) / 2) + 1,
              activityReps,
          )
        : 0;

    function triggerStepTransitionEffect() {
        isStepTransitioning = false;
        requestAnimationFrame(() => {
            isStepTransitioning = true;
            setTimeout(() => {
                isStepTransitioning = false;
            }, 700);
        });
    }

    function startIntro() {
        isIntro = true;
        timeLeft = 10;
        audioService.play(SOUNDS.intro);
        const nextActivity = workoutData.activities[0];
        if (nextActivity) {
            setTimeout(() => {
                playChainedVoice(
                    SOUNDS.startingProcedureNextVoice,
                    nextActivity.name,
                );
            }, 3000);
        }

        startTimer();
    }

    function startActivity() {
        const activity = workoutData.activities[currentActivityIndex];

        isIntro = false;
        isResting = false;

        const reps = activity.reps || activity.count;
        if (reps) {
            timeLeft = reps * 2;
            isRepBased = true;
        } else {
            timeLeft = activity.duration;
            isRepBased = false;
        }

        audioService.play(SOUNDS.start);
        startTimer();
    }

    function startRest() {
        isResting = true;
        isRepBased = false;

        let nextActivityName: string | null = null;
        let prefixVoice: string | null = null;

        // Check if it was the last activity of the set
        if (currentActivityIndex >= totalActivities - 1) {
            // Last activity of the set
            if (currentSet < totalSets) {
                timeLeft = workoutData.restBetweenSets || 60;
                const firstActivity = workoutData.activities[0];
                if (firstActivity) {
                    nextActivityName = firstActivity.name;
                    prefixVoice = SOUNDS.setCompleteNextVoice;
                }
            } else {
                // Workout complete!
                completeWorkout();
                return;
            }
        } else {
            timeLeft = workoutData.restBetweenActivities;
            const nextActivity =
                workoutData.activities[currentActivityIndex + 1];
            if (nextActivity) {
                nextActivityName = nextActivity.name;
                prefixVoice = SOUNDS.activityCompleteNextVoice;
            }
        }

        if (prefixVoice && nextActivityName) {
            playChainedVoice(prefixVoice, nextActivityName);
        }

        startTimer();
    }

    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!isPaused) {
                timeLeft--;

                // Sound logic
                if (timeLeft > 0) {
                    if (isRepBased) {
                        // For rep-based: beep every 2 seconds
                        if (timeLeft % 2 === 0) {
                            audioService.play(SOUNDS.beep);
                        }
                    } else {
                        // For duration-based: tick every 10s and last 3s
                        if (timeLeft % 10 === 0 || timeLeft <= 3) {
                            audioService.play(SOUNDS.tick);
                        }
                    }
                }

                if (timeLeft <= 0) {
                    handleTimerComplete();
                }
            }
        }, 1000);
    }

    function handleTimerComplete() {
        clearInterval(timerInterval);
        if (isIntro) {
            startActivity();
        } else if (isResting) {
            // Rest finished, next activity or next set
            if (currentActivityIndex >= totalActivities - 1) {
                currentSet++;
                currentActivityIndex = 0;
            } else {
                currentActivityIndex++;
            }
            triggerStepTransitionEffect();
            startActivity();
        } else {
            // Activity finished, start rest
            triggerStepTransitionEffect();
            startRest();
        }
    }

    function completeWorkout() {
        clearInterval(timerInterval);
        audioService.play(SOUNDS.complete);
        audioService.play(SOUNDS.missionCompleteVoice);
        onComplete();
    }

    function togglePause() {
        isPaused = !isPaused;
    }

    function skip() {
        audioService.stopAll();
        handleTimerComplete();
    }

    function formatTime(seconds: number) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    function adjustSets(delta: number) {
        const newSets = totalSets + delta;
        if (newSets >= 1 && newSets <= 10) {
            totalSets = newSets;
            audioService.play(SOUNDS.click);
        }
    }

    function beginSession() {
        isSetup = false;
        startIntro();
    }

    // Sound Constants
    const SOUNDS = {
        tick: "/audio/second_tick.mp3",
        start: "/audio/activity_start_ping.mp3",
        complete: "/audio/complete.mp3",
        intro: "/audio/intro.mp3",
        beep: "/audio/beep.mp3",
        missionCompleteVoice: "/audio/voice/heart/mission-completed.mp3",
        startingProcedureNextVoice:
            "/audio/voice/heart/starting-procedure.-next-activity-is.mp3",
        activityCompleteNextVoice:
            "/audio/voice/heart/activity-complete.-next-activity-is.mp3",
        setCompleteNextVoice:
            "/audio/voice/heart/set-complete.-next-activity-is.mp3",
        click: "/audio/click.mp3",
        close: "/audio/close.mp3",
    };

    onMount(() => {
        // Preload sounds
        audioService.preload(Object.values(SOUNDS));

        // Request wake lock to keep screen on
        requestWakeLock();

        // Re-acquire wake lock if user switches apps and comes back
        document.addEventListener("visibilitychange", handleVisibilityChange);
    });

    function getActivityVoiceUrl(name: string): string {
        return `/audio/voice/heart/${name.toLowerCase().replace(/ /g, "-")}.mp3`;
    }

    // Screen Wake Lock functions
    async function requestWakeLock() {
        try {
            if ("wakeLock" in navigator) {
                wakeLock = await (navigator as any).wakeLock.request("screen");
                console.log("Wake Lock acquired");

                wakeLock.addEventListener("release", () => {
                    console.log("Wake Lock released");
                });
            }
        } catch (err) {
            console.error(`Wake Lock error: ${err}`);
        }
    }

    function releaseWakeLock() {
        if (wakeLock !== null) {
            wakeLock
                .release()
                .then(() => {
                    wakeLock = null;
                })
                .catch((err: any) => {
                    console.error(`Wake Lock release error: ${err}`);
                });
        }
    }

    function handleVisibilityChange() {
        if (document.visibilityState === "visible" && wakeLock === null) {
            requestWakeLock();
        }
    }

    onDestroy(() => {
        clearInterval(timerInterval);
        releaseWakeLock();
        audioService.stopAll();
        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );
    });

    async function playChainedVoice(prefixUrl: string, activityName: string) {
        if (!prefixUrl || !activityName) {
            return;
        }

        const activityVoiceUrl = getActivityVoiceUrl(activityName);

        try {
            await audioService.play(prefixUrl);
            await audioService.play(activityVoiceUrl);
        } catch (e) {
            console.error("Error playing chained voice:", e);
        }
    }
</script>

<div
    class="session-container fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-bg)] text-center overflow-hidden"
    in:fade={{ duration: 300 }}
>
    <!-- Background Grid & Effects -->
    <div class="absolute inset-0 pointer-events-none z-0">
        <div class="grid-bg absolute inset-0 opacity-20"></div>
        <div class="vignette absolute inset-0"></div>
        <div class="scanlines absolute inset-0 opacity-10"></div>
    </div>

    {#if isStepTransitioning}
        <div class="step-glitch-overlay">
            <div class="step-glitch-layer step-glitch-layer--1"></div>
            <div class="step-glitch-layer step-glitch-layer--2"></div>
            <div class="step-glitch-layer step-glitch-layer--3"></div>
            <div class="step-glitch-noise"></div>
            <div class="step-glitch-label">// PROTOCOL_SHIFT</div>
        </div>
    {/if}

    <!-- HUD Frame -->
    <div class="hud-frame absolute inset-4 opacity-50 pointer-events-none z-10">
        <div class="corner top-left"></div>
        <div class="corner top-right"></div>
        <div class="corner bottom-left"></div>
        <div class="corner bottom-right"></div>
    </div>

    <!-- Close Button -->
    <button
        class="absolute top-8 right-8 z-30 text-[var(--color-dim)] hover:text-[var(--color-primary)] transition-colors p-2"
        on:click={() => {
            audioService.play(SOUNDS.close);
            audioService.stopAll();
            onCancel();
        }}
        aria-label="Abort Session"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M6 18L18 6M6 6l12 12"
            />
        </svg>
    </button>

    <!-- Main Content Area -->
    <div class="relative z-20 flex flex-col items-center w-full max-w-2xl px-6">
        <!-- Top Bar: Counters (Centered) -->
        <div class="w-full flex justify-center items-center gap-8 mb-6">
            {#if isSetup}
                <div class="hud-counter">
                    <span class="label">TARGET</span>
                    <span class="value">CONFIGURATION</span>
                </div>
            {:else}
                <div class="hud-counter">
                    <span class="label">SET</span>
                    <span class="value"
                        >{currentSet}
                        <span class="total">/ {totalSets}</span></span
                    >
                </div>
                <div class="hud-separator"></div>
                <div class="hud-counter">
                    <span class="label">ACTIVITY</span>
                    <span class="value"
                        >{currentActivityIndex + 1}
                        <span class="total">/ {totalActivities}</span></span
                    >
                </div>
            {/if}
        </div>

        <!-- Activity Visual -->
        <div
            class="relative w-full aspect-video bg-[#050505] border border-[var(--color-primary)] mb-8 group overflow-hidden shadow-[0_0_30px_rgba(0,243,255,0.1)]"
        >
            <!-- Activity Image -->
            <img
                src={activityImagePath}
                alt={displayActivity.name}
                class="w-full h-full object-contain bg-white"
            />

            <!-- Tech Overlays -->
            <div
                class="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[var(--color-primary)]"
            ></div>
            <div
                class="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[var(--color-primary)]"
            ></div>
            <div
                class="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[var(--color-primary)]"
            ></div>
            <div
                class="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[var(--color-primary)]"
            ></div>

            <div
                class="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,243,255,0.05)_50%)] bg-[length:100%_4px] pointer-events-none"
            ></div>
        </div>

        <!-- Status & Timer -->
        <div class="flex flex-col items-center mb-8 w-full gap-2">
            {#if isSetup}
                <h2
                    class="text-2xl font-display mb-2 tracking-widest uppercase text-[var(--color-primary)] text-glow"
                >
                    // PROTOCOL_SETUP
                </h2>

                <div class="flex items-center gap-8 my-4">
                    <button
                        class="text-[var(--color-primary)] hover:text-white transition-colors p-4 border border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                        on:click={() => adjustSets(-1)}
                        aria-label="Decrease sets"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-8 w-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M20 12H4"
                            />
                        </svg>
                    </button>

                    <div class="flex flex-col items-center">
                        <span
                            class="text-6xl font-bold text-white tracking-tighter tabular-nums"
                            style="text-shadow: 0 0 20px rgba(0,243,255,0.5);"
                        >
                            {totalSets}
                        </span>
                        <span
                            class="text-[var(--color-dim)] text-sm font-mono tracking-[0.2em]"
                            >SETS</span
                        >
                    </div>

                    <button
                        class="text-[var(--color-primary)] hover:text-white transition-colors p-4 border border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                        on:click={() => adjustSets(1)}
                        aria-label="Increase sets"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-8 w-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                    </button>
                </div>
            {:else}
                <h2
                    class="text-2xl font-display mb-2 tracking-widest uppercase text-glow glitch-title transition-colors duration-300 {isResting ||
                    isIntro
                        ? 'text-[var(--color-secondary)]'
                        : 'text-[var(--color-primary)]'}"
                    data-text={isIntro
                        ? "// SYSTEM_INIT"
                        : isResting
                          ? "// RECOVERY_MODE"
                          : currentActivity.name}
                >
                    {#if isIntro}
                        // SYSTEM_INIT
                    {:else if isResting}
                        // RECOVERY_MODE
                    {:else}
                        {currentActivity.name}
                    {/if}
                </h2>

                <!-- Next Activity Info -->
                {#if isResting || isIntro}
                    <div class="flex flex-col items-center animate-fade-in">
                        <span
                            class="text-[var(--color-dim)] text-xs font-mono tracking-[0.2em] mb-1"
                            >NEXT_PROTOCOL</span
                        >
                        <span
                            class="text-xl font-mono uppercase text-white tracking-wide"
                        >
                            {#if isIntro}
                                {workoutData.activities[0].name}
                            {:else if currentActivityIndex >= totalActivities - 1 && currentSet < totalSets}
                                {workoutData.activities[0].name}
                                <span
                                    class="text-[var(--color-dim)] text-sm ml-2"
                                    >[SET {currentSet + 1}]</span
                                >
                            {:else if currentActivityIndex < totalActivities - 1}
                                {workoutData.activities[
                                    currentActivityIndex + 1
                                ].name}
                            {:else}
                                SESSION_COMPLETE
                            {/if}
                        </span>
                    </div>
                {/if}

                <div class="relative flex flex-col items-center">
                    {#if isRepBased && !isResting && !isIntro}
                        <div
                            class="text-[var(--color-primary)] text-2xl font-mono tracking-widest mb-2 animate-pulse"
                        >
                            REPS: {currentRep} / {activityReps}
                        </div>
                    {/if}

                    <div
                        class="text-4xl font-bold text-white tracking-tighter tabular-nums timer-display"
                        style="text-shadow: 0 0 20px rgba(255,255,255,0.5);"
                    >
                        {formatTime(timeLeft)}
                    </div>
                    <!-- Decorative lines around timer -->
                    <div
                        class="absolute -left-8 top-1/2 w-4 h-[1px] bg-[var(--color-dim)]"
                    ></div>
                    <div
                        class="absolute -right-8 top-1/2 w-4 h-[1px] bg-[var(--color-dim)]"
                    ></div>
                </div>
            {/if}
        </div>

        <!-- Progress Bar -->
        {#if !isSetup}
            <div
                class="w-full h-6 bg-[#111] border border-[var(--color-dim)] relative mb-6 overflow-hidden"
            >
                <!-- Ticks -->
                <div class="absolute inset-0 flex justify-between px-1">
                    {#each Array(20) as _, i}
                        <div class="w-[1px] h-full bg-[#222]"></div>
                    {/each}
                </div>

                <div
                    class="h-full bg-[var(--color-primary)] relative transition-all duration-1000 ease-linear progress-glitch"
                    style="width: {progressPercentage}%"
                >
                    <div
                        class="absolute inset-0 bg-white/20 animate-pulse"
                    ></div>
                    <div
                        class="absolute right-0 top-0 bottom-0 w-[2px] bg-white box-shadow-[0_0_10px_white]"
                    ></div>
                </div>
            </div>
        {/if}

        <!-- Controls -->
        <div class="flex flex-col gap-3 z-30 w-full">
            {#if isSetup}
                <SessionControlButton
                    variant="skip"
                    onClick={() => {
                        audioService.play(SOUNDS.click);
                        beginSession();
                    }}
                >
                    INITIATE >>
                </SessionControlButton>
            {:else if isResting || isIntro}
                <SessionControlButton
                    variant="skip"
                    onClick={() => {
                        audioService.play(SOUNDS.click);
                        skip();
                    }}
                >
                    SKIP_SEQUENCE >>
                </SessionControlButton>
            {:else}
                <button
                    class="mech-btn-secondary"
                    on:click={() => {
                        audioService.play(SOUNDS.click);
                        togglePause();
                    }}
                >
                    {isPaused ? "RESUME" : "PAUSE"}
                </button>
                <SessionControlButton
                    variant="skip"
                    onClick={() => {
                        audioService.play(SOUNDS.click);
                        skip();
                    }}
                >
                    SKIP >>
                </SessionControlButton>
            {/if}
            <SessionControlButton
                variant="abort"
                onClick={() => {
                    audioService.play(SOUNDS.click);
                    audioService.stopAll();
                    onCancel();
                }}
            >
                ABORT
            </SessionControlButton>
        </div>
    </div>
</div>

<style>
    /* Full-screen step glitch overlay */
    .step-glitch-overlay {
        position: absolute;
        inset: 0;
        z-index: 40;
        pointer-events: none;
        mix-blend-mode: screen;
        overflow: hidden;
        background: radial-gradient(
                circle at center,
                rgba(216, 241, 255, 0.2),
                transparent 55%
            ),
            radial-gradient(
                circle at top,
                rgba(255, 75, 43, 0.35),
                transparent 60%
            );
        animation: step-glitch-fade 0.7s ease-out forwards;
    }

    .step-glitch-layer {
        position: absolute;
        inset: 0;
        background: linear-gradient(
                rgba(216, 241, 255, 0.2) 1px,
                transparent 1px
            ),
            linear-gradient(90deg, rgba(255, 75, 43, 0.3) 1px, transparent 1px);
        opacity: 0;
    }

    .step-glitch-layer--1 {
        animation: step-glitch-slice-1 0.7s ease-out forwards;
    }

    .step-glitch-layer--2 {
        animation: step-glitch-slice-2 0.7s ease-out forwards;
    }

    .step-glitch-layer--3 {
        animation: step-glitch-slice-3 0.7s ease-out forwards;
    }

    .step-glitch-noise {
        position: absolute;
        inset: -20px;
        background-image: repeating-linear-gradient(
            0deg,
            rgba(255, 255, 255, 0.15) 0px,
            rgba(255, 255, 255, 0.15) 1px,
            transparent 1px,
            transparent 3px
        );
        opacity: 0;
        animation: step-glitch-noise 0.7s ease-out forwards;
    }

    .step-glitch-label {
        position: absolute;
        bottom: 12%;
        left: 50%;
        transform: translateX(-50%);
        font-family: var(--font-mono);
        font-size: 0.9rem;
        letter-spacing: 0.25em;
        color: var(--color-primary);
        text-shadow:
            0 0 8px rgba(0, 243, 255, 0.9),
            0 0 16px rgba(255, 0, 153, 0.7);
        animation: step-glitch-label 0.7s ease-out forwards;
        white-space: nowrap;
    }

    @keyframes step-glitch-fade {
        0% {
            opacity: 0;
        }
        8% {
            opacity: 1;
        }
        55% {
            opacity: 1;
        }
        80% {
            opacity: 0.35;
        }
        100% {
            opacity: 0;
        }
    }

    @keyframes step-glitch-slice-1 {
        0% {
            opacity: 0;
            clip-path: inset(45% 0 45% 0);
            transform: translateX(-6px);
        }
        25% {
            opacity: 1;
            clip-path: inset(40% 0 30% 0);
            transform: translateX(4px);
        }
        60% {
            opacity: 0.8;
            clip-path: inset(60% 0 20% 0);
            transform: translateX(-2px);
        }
        100% {
            opacity: 0;
            clip-path: inset(50% 0 50% 0);
            transform: translateX(0);
        }
    }

    @keyframes step-glitch-slice-2 {
        0% {
            opacity: 0;
            clip-path: inset(10% 0 80% 0);
            transform: translateX(8px);
        }
        20% {
            opacity: 1;
            clip-path: inset(5% 0 60% 0);
            transform: translateX(-6px);
        }
        55% {
            opacity: 0.5;
            clip-path: inset(15% 0 50% 0);
            transform: translateX(3px);
        }
        100% {
            opacity: 0;
            clip-path: inset(0 0 100% 0);
            transform: translateX(0);
        }
    }

    @keyframes step-glitch-slice-3 {
        0% {
            opacity: 0;
            clip-path: inset(80% 0 5% 0);
            transform: translateX(-10px);
        }
        15% {
            opacity: 1;
            clip-path: inset(70% 0 0 0);
            transform: translateX(5px);
        }
        50% {
            opacity: 0.75;
            clip-path: inset(75% 0 5% 0);
            transform: translateX(-3px);
        }
        100% {
            opacity: 0;
            clip-path: inset(100% 0 0 0);
            transform: translateX(0);
        }
    }

    @keyframes step-glitch-noise {
        0% {
            opacity: 0;
            transform: translateY(0);
        }
        18% {
            opacity: 0.6;
            transform: translateY(-4px);
        }
        55% {
            opacity: 0.4;
            transform: translateY(3px);
        }
        100% {
            opacity: 0;
            transform: translateY(0);
        }
    }

    @keyframes step-glitch-label {
        0% {
            opacity: 0;
            transform: translateX(-50%) translateY(4px) scale(0.95);
        }
        20% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1.05);
        }
        60% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
        }
        100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-2px) scale(0.98);
        }
    }

    /* Grid Background */
    .grid-bg {
        background-image: linear-gradient(
                rgba(216, 241, 255, 0.08) 1px,
                transparent 1px
            ),
            linear-gradient(
                90deg,
                rgba(216, 241, 255, 0.08) 1px,
                transparent 1px
            );
        background-size: 40px 40px;
        transform: perspective(500px) rotateX(60deg) translateY(-100px) scale(2);
        animation: grid-move 20s linear infinite;
    }

    @keyframes grid-move {
        0% {
            background-position: 0 0;
        }
        100% {
            background-position: 0 40px;
        }
    }

    .vignette {
        background: radial-gradient(circle, transparent 40%, #000 100%);
    }

    /* HUD Frame Corners */
    .hud-frame .corner {
        position: absolute;
        width: 20px;
        height: 20px;
        border-color: var(--color-primary);
        border-style: solid;
    }
    .hud-frame .top-left {
        top: 0;
        left: 0;
        border-width: 2px 0 0 2px;
    }
    .hud-frame .top-right {
        top: 0;
        right: 0;
        border-width: 2px 2px 0 0;
    }
    .hud-frame .bottom-left {
        bottom: 0;
        left: 0;
        border-width: 0 0 2px 2px;
    }
    .hud-frame .bottom-right {
        bottom: 0;
        right: 0;
        border-width: 0 2px 2px 0;
    }

    /* Counters */
    .hud-counter {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .hud-counter .label {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        color: var(--color-dim);
        letter-spacing: 0.2em;
        margin-bottom: 0.2rem;
    }
    .hud-counter .value {
        font-family: var(--font-display);
        font-size: 1.5rem;
        color: var(--color-primary);
        font-weight: bold;
        text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
    }
    .hud-counter .total {
        font-size: 1rem;
        color: var(--color-dim);
        font-weight: normal;
    }
    .hud-separator {
        width: 1px;
        height: 30px;
        background: var(--color-dim);
        transform: rotate(15deg);
    }

    .timer-display {
        font-family: var(--font-display);
    }

    .progress-glitch {
        box-shadow:
            0 0 12px rgba(0, 243, 255, 0.6),
            0 0 24px rgba(0, 243, 255, 0.4);
        position: relative;
        overflow: visible;
        animation: progress-glow 4s infinite ease-in-out;
    }

    @keyframes progress-glow {
        0%,
        100% {
            box-shadow:
                0 0 8px rgba(0, 243, 255, 0.5),
                0 0 16px rgba(0, 243, 255, 0.3);
        }
        50% {
            box-shadow:
                0 0 18px rgba(0, 243, 255, 0.9),
                0 0 32px rgba(0, 243, 255, 0.7);
        }
    }
</style>
