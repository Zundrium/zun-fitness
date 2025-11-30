<script lang="ts">
  export let variant: "skip" | "abort" = "skip";
  export let onClick: () => void;

  $: baseClass =
    variant === "skip"
      ? "mech-btn"
      : "mech-btn-secondary text-[var(--color-secondary)] border-[var(--color-secondary)] hover:border-[var(--color-secondary)] hover:text-[var(--color-secondary)] hover:shadow-[0_0_15px_rgba(255,75,43,0.4)]";
</script>

<button class={baseClass} on:click={onClick}>
  <span class="relative z-10 flex items-center justify-center gap-2">
    <slot />
  </span>
</button>
