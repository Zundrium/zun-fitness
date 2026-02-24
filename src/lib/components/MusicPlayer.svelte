<script lang="ts">
	import { onMount, onDestroy } from "svelte";

	interface Track {
		title: string;
		path: string;
	}

	interface StyleGroup {
		label: string;
		key: string;
		tracks: Track[];
	}

	const STYLES: StyleGroup[] = [
		{
			label: "90S",
			key: "90s",
			tracks: [
				{
					title: "Be My Lover",
					path: "/audio/music/90s/Be My Lover - La Bouche.m4a",
				},
				{
					title: "Firestarter",
					path: "/audio/music/90s/Firestarter - The Prodigy.m4a",
				},
				{
					title: "It's Like That",
					path: "/audio/music/90s/It's Like That - Run–D.M.C., Jason Nevins.m4a",
				},
				{
					title: "It's Tricky",
					path: "/audio/music/90s/It's Tricky - Run–D.M.C..m4a",
				},
				{
					title: "Lovefool",
					path: "/audio/music/90s/Lovefool - The Cardigans.m4a",
				},
				{
					title: "No Diggity",
					path: "/audio/music/90s/No Diggity - Blackstreet, Dr. Dre, Queen Pen.m4a",
				},
				{
					title: "Pump Up The Jam",
					path: "/audio/music/90s/Pump Up The Jam - Technotronic.m4a",
				},
				{
					title: "Rhythm Is a Dancer",
					path: "/audio/music/90s/Rhythm Is a Dancer - SNAP!.m4a",
				},
				{
					title: "Spice Up Your Life",
					path: "/audio/music/90s/Spice Up Your Life - Spice Girls.m4a",
				},
				{
					title: "The Rhythm Of The Night",
					path: "/audio/music/90s/The Rhythm Of The Night - Corona.m4a",
				},
				{
					title: "What Is Love",
					path: "/audio/music/90s/What Is Love - 7 Mix - Haddaway.m4a",
				},
			],
		},
		{
			label: "METAL",
			key: "metal",
			tracks: [
				{
					title: "Dying Breed",
					path: "/audio/music/metal/Dying Breed - Five Finger Death Punch.m4a",
				},
				{
					title: "No",
					path: "/audio/music/metal/No - Fleshgod Apocalypse.m4a",
				},
				{
					title: "Roundabout",
					path: "/audio/music/metal/Roundabout - Allegaeon.m4a",
				},
				{
					title: "The Dopamine Void Pt. II",
					path: "/audio/music/metal/The Dopamine Void, Pt. II - Allegaeon.m4a",
				},
				{
					title: "The Fool",
					path: "/audio/music/metal/The Fool - Fleshgod Apocalypse.m4a",
				},
				{
					title: "War is the Answer",
					path: "/audio/music/metal/War is the Answer - Five Finger Death Punch.m4a",
				},
				{
					title: "mnemonic",
					path: "/audio/music/weeb/mnemonic - Intervals.m4a",
				},
			],
		},
		{
			label: "WEEB",
			key: "weeb",
			tracks: [
				{
					title: "HEKIREKI",
					path: "/audio/music/weeb/HEKIREKI - TV SIZE - LAST ALLIANCE.m4a",
				},
				{
					title: "Inner Light",
					path: "/audio/music/weeb/Inner Light - Shocking Lemon.m4a",
				},
				{
					title: "Mirage",
					path: "/audio/music/weeb/Mirage - Creepy Nuts.m4a",
				},
				{ title: "chase", path: "/audio/music/weeb/chase - batta.m4a" },
				{
					title: "Yofukashino Uta",
					path: "/audio/music/weeb/よふかしのうた - Yofukashino Uta - Creepy Nuts.m4a",
				},
				{
					title: "Otonoke",
					path: "/audio/music/weeb/オトノケ - Otonoke - Creepy Nuts.m4a",
				},
			],
		},
	];

	let isExpanded = false;
	let isPlaying = false;
	let isMuted = false;
	let volume = 0.7;
	let currentStyleKey = "90s";
	let currentTrackIndex = -1;
	let shuffledQueue: number[] = [];
	let queuePos = 0;
	let currentTitle = "";
	let audio: HTMLAudioElement | null = null;
	let progressPct = 0;
	let progressInterval: ReturnType<typeof setInterval> | null = null;

	$: currentStyle = STYLES.find((s) => s.key === currentStyleKey)!;

	// ── Helpers ──────────────────────────────────────────────────────────────

	function getStyleTracks(styleKey: string): Track[] {
		return STYLES.find((s) => s.key === styleKey)!.tracks;
	}

	function buildShuffledQueue(
		styleKey: string,
		excludeIndex: number = -1,
	): number[] {
		const tracks = getStyleTracks(styleKey);
		const indices = tracks.map((_, i) => i);
		for (let i = indices.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[indices[i], indices[j]] = [indices[j], indices[i]];
		}
		if (
			excludeIndex !== -1 &&
			indices[0] === excludeIndex &&
			indices.length > 1
		) {
			const swap = Math.floor(Math.random() * (indices.length - 1)) + 1;
			[indices[0], indices[swap]] = [indices[swap], indices[0]];
		}
		return indices;
	}

	function stopProgress() {
		if (progressInterval !== null) {
			clearInterval(progressInterval);
			progressInterval = null;
		}
	}

	function startProgress() {
		stopProgress();
		progressInterval = setInterval(() => {
			if (audio && audio.duration > 0) {
				progressPct = (audio.currentTime / audio.duration) * 100;
			}
		}, 250);
	}

	// ── Core playback — styleKey passed explicitly, never reads reactive $: ──

	function loadAndPlay(styleKey: string, trackIndex: number) {
		if (audio) {
			audio.pause();
			audio.src = "";
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
		}
		stopProgress();
		progressPct = 0;

		const tracks = getStyleTracks(styleKey);
		const track = tracks[trackIndex];
		currentTrackIndex = trackIndex;
		currentTitle = track.title;

		audio = new Audio(track.path);
		audio.volume = isMuted ? 0 : volume;
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);
		audio.play().catch((e) => console.error("Music play failed:", e));
		isPlaying = true;
		startProgress();
	}

	function handleEnded() {
		playNext();
	}

	function handleError(e: Event) {
		console.error("Music load error:", e);
		playNext();
	}

	function playNext() {
		queuePos++;
		if (queuePos >= shuffledQueue.length) {
			shuffledQueue = buildShuffledQueue(
				currentStyleKey,
				shuffledQueue[shuffledQueue.length - 1],
			);
			queuePos = 0;
		}
		loadAndPlay(currentStyleKey, shuffledQueue[queuePos]);
	}

	function playPrev() {
		if (audio && audio.currentTime > 3) {
			audio.currentTime = 0;
			return;
		}
		queuePos--;
		if (queuePos < 0) {
			queuePos = shuffledQueue.length - 1;
		}
		loadAndPlay(currentStyleKey, shuffledQueue[queuePos]);
	}

	function togglePlay() {
		if (!audio || currentTrackIndex === -1) {
			shuffledQueue = buildShuffledQueue(currentStyleKey);
			queuePos = 0;
			loadAndPlay(currentStyleKey, shuffledQueue[0]);
			return;
		}
		if (isPlaying) {
			audio.pause();
			isPlaying = false;
			stopProgress();
		} else {
			audio.play().catch((e) => console.error("Resume failed:", e));
			isPlaying = true;
			startProgress();
		}
	}

	function switchStyle(key: string) {
		if (key === currentStyleKey) return;
		// Tear down current audio first
		if (audio) {
			audio.pause();
			audio.src = "";
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
			audio = null;
		}
		stopProgress();
		// Update key, reset state, build new queue — all before loadAndPlay
		currentStyleKey = key;
		currentTrackIndex = -1;
		currentTitle = "";
		progressPct = 0;
		shuffledQueue = buildShuffledQueue(key);
		queuePos = 0;
		// Pass key explicitly so we never depend on reactive $: currentStyle
		loadAndPlay(key, shuffledQueue[0]);
	}

	function toggleMute() {
		isMuted = !isMuted;
		if (audio) audio.volume = isMuted ? 0 : volume;
	}

	function handleVolumeInput(e: Event) {
		const target = e.target as HTMLInputElement;
		volume = parseFloat(target.value);
		if (audio && !isMuted) audio.volume = volume;
		if (volume > 0 && isMuted) isMuted = false;
	}

	function handleProgressClick(e: MouseEvent) {
		if (!audio || !audio.duration) return;
		const bar = e.currentTarget as HTMLElement;
		const rect = bar.getBoundingClientRect();
		const pct = Math.max(
			0,
			Math.min(1, (e.clientX - rect.left) / rect.width),
		);
		audio.currentTime = pct * audio.duration;
		progressPct = pct * 100;
	}

	function toggleExpand() {
		isExpanded = !isExpanded;
	}

	/** Called by +page.svelte after the welcome-back sound finishes playing */
	export function start() {
		if (isPlaying) return;
		shuffledQueue = buildShuffledQueue(currentStyleKey);
		queuePos = 0;
		loadAndPlay(currentStyleKey, shuffledQueue[0]);
	}

	onMount(() => {
		shuffledQueue = buildShuffledQueue(currentStyleKey);
		queuePos = 0;
	});

	onDestroy(() => {
		stopProgress();
		if (audio) {
			audio.pause();
			audio.src = "";
		}
	});

	$: if (audio && !isMuted) {
		audio.volume = volume;
	}
</script>

<!-- Fixed top bar -->
<div class="music-bar" class:expanded={isExpanded}>
	<!-- Collapsed handle (always visible) -->
	<div
		class="bar-header"
		role="button"
		tabindex="0"
		on:click={toggleExpand}
		on:keydown={(e) => e.key === "Enter" && toggleExpand()}
	>
		<div class="bar-header-left">
			<span class="expand-icon" class:rotated={isExpanded}>▶</span>
			<span class="bar-label">MUSIC.SYS</span>
			{#if !isExpanded && currentTitle}
				<span class="bar-now-playing">— {currentTitle}</span>
			{/if}
		</div>

		<div
			class="bar-controls-quick"
			role="none"
			on:click|stopPropagation
			on:keydown|stopPropagation
		>
			<button
				class="ctrl-btn"
				on:click={playPrev}
				title="Previous"
				aria-label="Previous track"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"
					><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" /></svg
				>
			</button>
			<button
				class="ctrl-btn ctrl-play"
				on:click={togglePlay}
				title={isPlaying ? "Pause" : "Play"}
				aria-label={isPlaying ? "Pause" : "Play"}
			>
				{#if isPlaying}
					<svg
						viewBox="0 0 24 24"
						fill="currentColor"
						width="16"
						height="16"><path d="M6 19h4V5H6zm8-14v14h4V5z" /></svg
					>
				{:else}
					<svg
						viewBox="0 0 24 24"
						fill="currentColor"
						width="16"
						height="16"><path d="M8 5v14l11-7z" /></svg
					>
				{/if}
			</button>
			<button
				class="ctrl-btn"
				on:click={playNext}
				title="Next"
				aria-label="Next track"
			>
				<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"
					><path d="M6 18l8.5-6L6 6zm8.5-6 2.5 1.5V8.5L14.5 12z" /><path
						d="M16 6h2v12h-2z"
					/></svg
				>
			</button>
			<button
				class="ctrl-btn"
				on:click={toggleMute}
				title={isMuted ? "Unmute" : "Mute"}
				aria-label={isMuted ? "Unmute" : "Mute"}
			>
				{#if isMuted || volume === 0}
					<svg
						viewBox="0 0 24 24"
						fill="currentColor"
						width="14"
						height="14"
						><path
							d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 20l1.27 1L20.46 19.73l-16.46-16.73z"
						/></svg
					>
				{:else if volume < 0.5}
					<svg
						viewBox="0 0 24 24"
						fill="currentColor"
						width="14"
						height="14"
						><path
							d="M18.5 12A4.5 4.5 0 0 0 16 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"
						/></svg
					>
				{:else}
					<svg
						viewBox="0 0 24 24"
						fill="currentColor"
						width="14"
						height="14"
						><path
							d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
						/></svg
					>
				{/if}
			</button>
		</div>
	</div>

	<!-- Progress bar (always visible) -->
	<div
		class="progress-track"
		role="slider"
		aria-valuenow={progressPct}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Track progress"
		tabindex="0"
		on:click={handleProgressClick}
		on:keydown={(e) => {
			if (!audio || !audio.duration) return;
			if (e.key === "ArrowRight")
				audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
			if (e.key === "ArrowLeft")
				audio.currentTime = Math.max(0, audio.currentTime - 5);
		}}
	>
		<div class="progress-fill" style="width: {progressPct}%"></div>
	</div>

	<!-- Expanded panel -->
	{#if isExpanded}
		<div class="expanded-panel">
			<div class="style-selector">
				{#each STYLES as style}
					<button
						class="style-btn"
						class:active={currentStyleKey === style.key}
						on:click={() => switchStyle(style.key)}
					>
						{style.label}
					</button>
				{/each}
			</div>

			<div class="info-volume-row">
				<div class="track-info">
					{#if currentTitle}
						<span class="track-title-label">{currentTitle}</span>
						<span class="track-style-label">{currentStyle.label}</span>
					{:else}
						<span class="track-idle">PRESS PLAY TO BEGIN</span>
					{/if}
				</div>
				<div class="volume-row">
					<span class="vol-label">VOL</span>
					<input
						type="range"
						class="volume-slider"
						min="0"
						max="1"
						step="0.01"
						value={volume}
						on:input={handleVolumeInput}
						aria-label="Volume"
					/>
					<span class="vol-value">{Math.round(volume * 100)}</span>
				</div>
			</div>

			<div class="track-list">
				{#each currentStyle.tracks as track, i}
					<button
						class="track-item"
						class:active={currentTrackIndex === i}
						on:click={() => {
							const idx = shuffledQueue.indexOf(i);
							if (idx !== -1) {
								queuePos = idx;
							} else {
								shuffledQueue = [
									i,
									...shuffledQueue.slice(queuePos + 1),
								];
								queuePos = 0;
							}
							loadAndPlay(currentStyleKey, i);
						}}
					>
						<span class="track-num">{String(i + 1).padStart(2, "0")}</span
						>
						<span class="track-name">{track.title}</span>
						{#if currentTrackIndex === i && isPlaying}
							<span class="playing-indicator">
								<span></span><span></span><span></span>
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.music-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 40;
		background: rgba(6, 8, 18, 0.92);
		border-bottom: 1px solid var(--color-border);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		font-family: var(--font-mono);
		transition: border-color 0.2s;
	}

	.music-bar.expanded {
		border-bottom-color: var(--color-primary);
		box-shadow: 0 0 20px rgba(0, 243, 255, 0.08);
	}

	.bar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.75rem;
		height: 2.25rem;
		cursor: pointer;
		user-select: none;
	}

	.bar-header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		overflow: hidden;
	}

	.expand-icon {
		font-size: 0.55rem;
		color: var(--color-primary);
		transition: transform 0.2s;
		display: inline-block;
		flex-shrink: 0;
	}

	.expand-icon.rotated {
		transform: rotate(90deg);
	}

	.bar-label {
		font-size: 0.65rem;
		letter-spacing: 0.2em;
		color: var(--color-primary);
		text-shadow: 0 0 6px rgba(0, 243, 255, 0.5);
		flex-shrink: 0;
	}

	.bar-now-playing {
		font-size: 0.62rem;
		color: var(--color-dim);
		letter-spacing: 0.05em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bar-controls-quick {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.ctrl-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-dim);
		padding: 0.25rem 0.3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.15s;
		border-radius: 2px;
	}

	.ctrl-btn:hover {
		color: var(--color-primary);
	}

	.ctrl-play {
		color: var(--color-primary);
		background: rgba(0, 243, 255, 0.08);
		border: 1px solid rgba(0, 243, 255, 0.2);
		border-radius: 2px;
	}

	.ctrl-play:hover {
		background: rgba(0, 243, 255, 0.18);
		box-shadow: 0 0 10px rgba(0, 243, 255, 0.3);
	}

	.progress-track {
		height: 2px;
		background: var(--color-border);
		cursor: pointer;
		position: relative;
		outline: none;
	}

	.progress-track:focus-visible {
		outline: 1px solid var(--color-primary);
		outline-offset: 1px;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-primary);
		box-shadow: 0 0 6px rgba(0, 243, 255, 0.6);
		transition: width 0.1s linear;
		pointer-events: none;
	}

	.expanded-panel {
		padding: 0.75rem;
		border-top: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-height: 70vh;
		overflow-y: auto;
	}

	.style-selector {
		display: flex;
		gap: 0.5rem;
	}

	.style-btn {
		background: transparent;
		border: 1px solid var(--color-border);
		color: var(--color-dim);
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.15em;
		padding: 0.3rem 0.75rem;
		cursor: pointer;
		transition: all 0.15s;
		clip-path: polygon(
			8px 0,
			100% 0,
			100% calc(100% - 8px),
			calc(100% - 8px) 100%,
			0 100%,
			0 8px
		);
	}

	.style-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
		box-shadow: 0 0 8px rgba(0, 243, 255, 0.15);
	}

	.style-btn.active {
		background: rgba(0, 243, 255, 0.1);
		border-color: var(--color-primary);
		color: var(--color-primary);
		box-shadow: 0 0 10px rgba(0, 243, 255, 0.2);
	}

	.info-volume-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.track-info {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
	}

	.track-title-label {
		font-size: 0.75rem;
		color: var(--color-text);
		letter-spacing: 0.05em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-style-label {
		font-size: 0.55rem;
		letter-spacing: 0.2em;
		color: var(--color-primary);
		background: rgba(0, 243, 255, 0.08);
		padding: 0.1rem 0.3rem;
		border: 1px solid rgba(0, 243, 255, 0.2);
		flex-shrink: 0;
	}

	.track-idle {
		font-size: 0.6rem;
		color: var(--color-dim);
		letter-spacing: 0.15em;
	}

	.volume-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.vol-label {
		font-size: 0.55rem;
		letter-spacing: 0.15em;
		color: var(--color-dim);
	}

	.vol-value {
		font-size: 0.55rem;
		color: var(--color-dim);
		width: 2ch;
		text-align: right;
	}

	.volume-slider {
		-webkit-appearance: none;
		appearance: none;
		width: 80px;
		height: 2px;
		background: var(--color-border);
		outline: none;
		cursor: pointer;
	}

	.volume-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 10px;
		height: 10px;
		background: var(--color-primary);
		border-radius: 0;
		box-shadow: 0 0 6px rgba(0, 243, 255, 0.5);
		cursor: pointer;
	}

	.volume-slider::-moz-range-thumb {
		width: 10px;
		height: 10px;
		background: var(--color-primary);
		border: none;
		border-radius: 0;
		box-shadow: 0 0 6px rgba(0, 243, 255, 0.5);
		cursor: pointer;
	}

	.track-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.track-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.35rem 0.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 0.1s;
		border-left: 2px solid transparent;
		width: 100%;
	}

	.track-item:hover {
		background: rgba(0, 243, 255, 0.04);
		border-left-color: var(--color-dim);
	}

	.track-item.active {
		background: rgba(0, 243, 255, 0.07);
		border-left-color: var(--color-primary);
	}

	.track-num {
		font-size: 0.55rem;
		color: var(--color-dim);
		letter-spacing: 0.1em;
		flex-shrink: 0;
		width: 1.6rem;
	}

	.track-name {
		font-size: 0.7rem;
		color: var(--color-text);
		letter-spacing: 0.04em;
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-item.active .track-name {
		color: var(--color-primary);
		text-shadow: 0 0 5px rgba(0, 243, 255, 0.4);
	}

	.playing-indicator {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 12px;
		flex-shrink: 0;
	}

	.playing-indicator span {
		display: block;
		width: 3px;
		background: var(--color-primary);
		box-shadow: 0 0 4px rgba(0, 243, 255, 0.6);
		animation: music-bar-bounce 0.8s ease-in-out infinite alternate;
	}

	.playing-indicator span:nth-child(1) {
		height: 6px;
		animation-delay: 0s;
	}
	.playing-indicator span:nth-child(2) {
		height: 10px;
		animation-delay: 0.2s;
	}
	.playing-indicator span:nth-child(3) {
		height: 7px;
		animation-delay: 0.4s;
	}

	@keyframes music-bar-bounce {
		from {
			transform: scaleY(0.4);
		}
		to {
			transform: scaleY(1);
		}
	}
</style>
