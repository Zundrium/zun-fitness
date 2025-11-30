<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  let time = new Date();
  let interval: ReturnType<typeof setInterval>;

  $: hours = time.getHours();
  $: minutes = time.getMinutes();
  $: seconds = time.getSeconds();

  // Fasting window: 10:00 - 14:00 (exclusive of 14:00? "between 10 and 14" usually means [10, 14))
  // Let's assume 10:00:00 to 13:59:59 is green.
  $: isEatingWindow = hours >= 10 && hours < 14;

  $: formattedTime = time.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  onMount(() => {
    interval = setInterval(() => {
      time = new Date();
    }, 1000);
  });

  onDestroy(() => {
    clearInterval(interval);
  });
</script>

<div class="clock-container relative mb-8 w-full">
  <div class="inline-block relative w-full">
    <!-- Decorative brackets -->
    <div
      class="absolute left-0 top-0 bottom-0 w-2 border-l-2 border-t-2 border-b-2 border-[var(--color-dim)] opacity-50 rounded-l-lg"
    ></div>
    <div
      class="absolute right-0 top-0 bottom-0 w-2 border-r-2 border-t-2 border-b-2 border-[var(--color-dim)] opacity-50 rounded-r-lg"
    ></div>

    <h1
      class="time font-mono tracking-widest glitch-title"
      class:eating-window={isEatingWindow}
      data-text={formattedTime}
    >
      {formattedTime}
    </h1>

    <div class="flex items-center justify-center gap-2 mt-2">
      <div
        class="h-1.5 w-1.5 rounded-full {isEatingWindow
          ? 'bg-[var(--color-primary)] animate-pulse'
          : 'bg-[var(--color-secondary)]'}"
      ></div>
      <p class="status font-mono text-xs tracking-[0.2em]">
        {#if isEatingWindow}
          FUELING.SYSTEMS.ONLINE
        {:else}
          FASTING.MODE.ACTIVE
        {/if}
      </p>
      <div
        class="h-1.5 w-1.5 rounded-full {isEatingWindow
          ? 'bg-[var(--color-primary)] animate-pulse'
          : 'bg-red-500'}"
      ></div>
    </div>
  </div>
</div>

<style>
  .clock-container {
    text-align: center;
    padding: 2rem 0;
  }

  .time {
    font-family: var(--font-display);
    font-size: 5rem;
    font-weight: 700;
    color: var(--color-secondary); /* Red/orange for fasting */
    transition: all 0.5s ease;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 10px rgba(255, 75, 43, 0.4);
    letter-spacing: 0.1em;
  }

  .time.eating-window {
    color: var(--color-primary); /* Primary light blue when eating */
    text-shadow:
      0 0 10px rgba(0, 247, 255, 0.7),
      0 0 20px rgba(0, 247, 255, 0.4),
      0 0 40px rgba(0, 247, 255, 0.2);
  }

  .status {
    color: var(--color-dim);
    transition:
      color 0.3s,
      text-shadow 0.3s;
  }

  .time.eating-window + div .status {
    color: var(--color-primary);
    text-shadow: 0 0 5px rgba(0, 247, 255, 0.6);
  }
</style>
