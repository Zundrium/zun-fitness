<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from '@lucide/svelte';

	import { audioService } from '$lib/services/audio';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { cn } from '$lib/utils';

	interface Track {
		title: string;
		path: string;
	}
	interface Playlist {
		label: string;
		tracks: Track[];
	}
	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
	const playlists: Record<string, Playlist> = {
		'90s': {
			label: '90s',
			tracks: [
				{ title: 'Be My Lover', path: '/audio/music/90s/Be My Lover - La Bouche.m4a' },
				{ title: 'Firestarter', path: '/audio/music/90s/Firestarter - The Prodigy.m4a' },
				{ title: 'No Diggity', path: '/audio/music/90s/No Diggity - Blackstreet, Dr. Dre, Queen Pen.m4a' },
				{ title: 'Rhythm Is a Dancer', path: '/audio/music/90s/Rhythm Is a Dancer - SNAP!.m4a' }
			]
		},
		metal: {
			label: 'Metal',
			tracks: [
				{ title: 'Dying Breed', path: '/audio/music/metal/Dying Breed - Five Finger Death Punch.m4a' },
				{ title: 'Roundabout', path: '/audio/music/metal/Roundabout - Allegaeon.m4a' },
				{ title: 'The Fool', path: '/audio/music/metal/The Fool - Fleshgod Apocalypse.m4a' }
			]
		},
		weeb: {
			label: 'Anime',
			tracks: [
				{ title: 'HEKIREKI', path: '/audio/music/weeb/HEKIREKI - TV SIZE - LAST ALLIANCE.m4a' },
				{ title: 'Inner Light', path: '/audio/music/weeb/Inner Light - Shocking Lemon.m4a' },
				{ title: 'Otonoke', path: '/audio/music/weeb/オトノケ - Otonoke - Creepy Nuts.m4a' }
			]
		}
	};

	let playlistKey = $state('90s');
	let trackIndex = $state(0);
	let playing = $state(false);
	let muted = $state(false);
	let audio: HTMLAudioElement | null = null;
	let activationPromise: Promise<void> | null = null;
	const playlist = $derived(playlists[playlistKey]);
	const track = $derived(playlist.tracks[trackIndex]);
	const WELCOME_SOUND = '/audio/voice/heart/welcome-back.m4a';
	const MUSIC_VOLUME = 0.35;

	onMount(() => {
		void audioService.preload([WELCOME_SOUND]).catch((error) =>
			console.error('Welcome audio preload failed:', error)
		);

		function activateAudio() {
			window.removeEventListener('pointerdown', activateAudio);
			window.removeEventListener('keydown', activateAudio);
			activationPromise = (async () => {
				await audioService.play(WELCOME_SOUND);
				if (!audio) playCurrent();
				activationPromise = null;
			})();
		}

		window.addEventListener('pointerdown', activateAudio, { once: true });
		window.addEventListener('keydown', activateAudio, { once: true });
		return () => {
			window.removeEventListener('pointerdown', activateAudio);
			window.removeEventListener('keydown', activateAudio);
		};
	});

	onDestroy(() => {
		audio?.pause();
		if (audio) audio.src = '';
	});

	function playCurrent() {
		audio?.pause();
		audio = new Audio(track.path);
		audio.volume = muted ? 0 : MUSIC_VOLUME;
		audio.addEventListener('ended', next);
		audio.play().then(() => (playing = true)).catch((error) => console.error('Music play failed:', error));
	}

	function togglePlay() {
		if (activationPromise) return;
		if (!audio) {
			playCurrent();
			return;
		}
		if (playing) {
			audio.pause();
			playing = false;
		} else {
			audio.play().then(() => (playing = true)).catch((error) => console.error('Music resume failed:', error));
		}
	}

	function next() {
		trackIndex = (trackIndex + 1) % playlist.tracks.length;
		playCurrent();
	}

	function previous() {
		trackIndex = (trackIndex - 1 + playlist.tracks.length) % playlist.tracks.length;
		playCurrent();
	}

	function choosePlaylist(key: string) {
		playlistKey = key;
		trackIndex = 0;
		playCurrent();
	}

	function toggleMute() {
		muted = !muted;
		if (audio) audio.volume = muted ? 0 : MUSIC_VOLUME;
	}
</script>

<Card class={cn('w-full flex-row items-center gap-1.5 bg-(--text)/4 p-1.5 shadow-none', className)}>
	<DropdownMenu>
		<DropdownMenuTrigger>
			{#snippet child({ props })}
				<Button variant="ghost" size="sm" class="shrink-0 px-2" {...props} aria-label="Choose music style">
					<Badge>{playlist.label}</Badge>
				</Button>
			{/snippet}
		</DropdownMenuTrigger>
		<DropdownMenuContent>
			<DropdownMenuLabel>Music style</DropdownMenuLabel>
			{#each Object.entries(playlists) as [key, value]}
				<DropdownMenuItem onclick={() => choosePlaylist(key)}>{value.label}</DropdownMenuItem>
			{/each}
		</DropdownMenuContent>
	</DropdownMenu>

	<div class="min-w-0 flex-1 px-1">
		<p class="truncate text-xs font-medium sm:text-sm">{track.title}</p>
	</div>
	<Button variant="ghost" size="icon" class="size-9" onclick={previous} aria-label="Previous track"><SkipBack class="size-4" /></Button>
	<Button size="icon" class="size-9" onclick={togglePlay} aria-label={playing ? 'Pause music' : 'Play music'}>
		{#if playing}<Pause class="size-4 fill-current" />{:else}<Play class="size-4 fill-current" />{/if}
	</Button>
	<Button variant="ghost" size="icon" class="size-9" onclick={next} aria-label="Next track"><SkipForward class="size-4" /></Button>
	<Button variant="ghost" size="icon" class="hidden size-9 sm:inline-flex" onclick={toggleMute} aria-label={muted ? 'Unmute music' : 'Mute music'}>
		{#if muted}<VolumeX class="size-4" />{:else}<Volume2 class="size-4" />{/if}
	</Button>
</Card>
