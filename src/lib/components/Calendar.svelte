<script lang="ts">
    import { audioService } from "../services/audio";

    interface Props {
        completedDays?: string[];
        ondayclick: (detail: { day: number; dateKey: string }) => void;
    }

    const SOUNDS = {
        click: "/audio/click.mp3",
    };

    let { completedDays = [], ondayclick }: Props = $props();

    const today = new Date();
    // Set hours to 0 to compare dates only, not time
    today.setHours(0, 0, 0, 0);

    // Using $state for these allows for future navigation (prev/next month)
    let currentMonth = $state(today.getMonth());
    let currentYear = $state(today.getFullYear());

    let daysInMonth = $derived(
        new Date(currentYear, currentMonth + 1, 0).getDate(),
    );

    // Calculate first day of month, adjusted for Monday start
    // getDay(): 0 = Sunday, 1 = Monday, ... 6 = Saturday
    // We want 0 = Monday, ... 6 = Sunday
    // Formula: (day + 6) % 7
    let firstDayOfMonth = $derived(
        (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7,
    );

    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    // Helper to format date key
    function getDateKey(day: number) {
        return `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    // Reactivity is automatic here because completedDays is a prop and deriveds update automatically
    function isDone(day: number) {
        return completedDays.includes(getDateKey(day));
    }

    function isPast(day: number) {
        const dayDate = new Date(currentYear, currentMonth, day);
        dayDate.setHours(0, 0, 0, 0);
        return dayDate < today;
    }

    function handleDayClick(day: number) {
        ondayclick?.({ day, dateKey: getDateKey(day) });
    }

    function prevMonth() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
    }

    function nextMonth() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }
</script>

<div class="w-full max-w-sm mx-auto relative group">
    <div class="text-center mb-6 relative">
        <div class="flex items-center justify-center gap-4">
            <button
                class="text-[var(--color-dim)] hover:text-[var(--color-primary)] transition-colors text-xl font-bold p-2 flex-1"
                onclick={() => {
                    audioService.play(SOUNDS.click);
                    prevMonth();
                }}
                aria-label="Previous Month"
            >
                &lt;
            </button>

            <div
                class="text-[var(--color-primary)] uppercase tracking-[0.2em] text-base font-mono text-glow min-w-[140px]"
            >
                {monthNames[currentMonth]}
            </div>

            <button
                class="text-[var(--color-dim)] hover:text-[var(--color-primary)] transition-colors text-xl font-bold p-2 flex-1"
                onclick={() => {
                    audioService.play(SOUNDS.click);
                    nextMonth();
                }}
                aria-label="Next Month"
            >
                &gt;
            </button>
        </div>
    </div>

    <div class="grid grid-cols-7 gap-2">
        {#each ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as day}
            <div
                class="text-center text-[var(--color-dim)] text-sm tracking-wider mb-2"
            >
                {day}
            </div>
        {/each}

        {#each Array(firstDayOfMonth) as _}
            <div class="aspect-square"></div>
        {/each}

        {#each Array(daysInMonth) as _, i}
            {@const day = i + 1}
            {@const done = isDone(day)}
            {@const past = isPast(day)}
            {@const isToday =
                day === today.getDate() &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear()}

            {@const baseClass =
                "aspect-square flex justify-center items-center text-sm relative transition-all duration-300 clip-path-slant"}

            {@const stateClass =
                past && !done
                    ? "bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40"
                    : past && done
                      ? "bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/30 text-[var(--color-primary)] border border-[var(--color-primary)]/50 shadow-[0_0_10px_rgba(0,243,255,0.2)]"
                      : done
                        ? "bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30"
                        : "bg-[var(--color-surface-light)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:shadow-[0_0_10px_rgba(0,243,255,0.1)]"}

            {@const todayClass = isToday
                ? "ring-1 ring-[var(--color-primary)] ring-offset-1 ring-offset-black shadow-[0_0_15px_rgba(0,243,255,0.5)]"
                : ""}

            {@const todayPulseClass = isToday
                ? done
                    ? "today-pulse-complete"
                    : "today-pulse-incomplete"
                : ""}

            <button
                class="{baseClass} {stateClass} {todayClass}"
                onclick={() => {
                    audioService.play(SOUNDS.click);
                    handleDayClick(day);
                }}
            >
                <span class="z-10 font-mono text-sm p-2 {todayPulseClass}"
                    >{day}</span
                >

                <!-- Corner marker for tech feel -->
                <div
                    class="absolute top-0 right-0 w-1 h-1 bg-current opacity-50"
                ></div>
            </button>
        {/each}
    </div>
</div>

<style>
    .clip-path-slant {
        clip-path: polygon(
            0 0,
            100% 0,
            100% calc(100% - 4px),
            calc(100% - 4px) 100%,
            0 100%
        );
    }

    .today-pulse-incomplete {
        color: var(--color-text);
        animation: day-pulse-incomplete 1.4s ease-in-out infinite;
    }

    .today-pulse-complete {
        /* Slightly more saturated light blue so it stands out from white */
        color: #9fd5ff;
        animation: day-pulse-complete 1.4s ease-in-out infinite;
    }

    @keyframes day-pulse-incomplete {
        0%,
        100% {
            text-shadow:
                0 0 4px rgba(227, 242, 255, 0.6),
                0 0 10px rgba(227, 242, 255, 0.4);
        }
        50% {
            text-shadow:
                0 0 8px rgba(227, 242, 255, 0.9),
                0 0 16px rgba(227, 242, 255, 0.7);
        }
    }

    @keyframes day-pulse-complete {
        0%,
        100% {
            text-shadow:
                0 0 4px rgba(159, 213, 255, 0.7),
                0 0 10px rgba(159, 213, 255, 0.5);
        }
        50% {
            text-shadow:
                0 0 8px rgba(159, 213, 255, 0.95),
                0 0 16px rgba(159, 213, 255, 0.8);
        }
    }
</style>
