export class AudioService {
    private static instance: AudioService;
    private context: AudioContext | null = null;
    private bufferCache: Map<string, AudioBuffer> = new Map();
    private activeSources: Set<AudioBufferSourceNode> = new Set();
    private isMuted: boolean = false;

    private constructor() { }

    public static getInstance(): AudioService {
        if (!AudioService.instance) {
            AudioService.instance = new AudioService();
        }
        return AudioService.instance;
    }

    private getContext(): AudioContext {
        if (!this.context) {
            // Create context only when needed
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.context = new AudioContextClass();
        }
        return this.context;
    }

    /**
     * Preloads a list of audio files into the cache.
     */
    public async preload(urls: string[]): Promise<void> {
        const promises = urls.map(url => this.loadBuffer(url));
        await Promise.all(promises);
    }

    /**
     * Loads an audio buffer from a URL. Returns cached buffer if available.
     */
    private async loadBuffer(url: string): Promise<AudioBuffer> {
        if (this.bufferCache.has(url)) {
            return this.bufferCache.get(url)!;
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.getContext().decodeAudioData(arrayBuffer);
            this.bufferCache.set(url, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Failed to load audio from ${url}:`, error);
            throw error;
        }
    }

    /**
     * Plays a sound from a URL.
     * @param url The URL of the sound file.
     * @param volume Volume level (0.0 to 1.0).
     * @returns A promise that resolves when the sound finishes playing.
     */
    public async play(url: string, volume: number = 1.0): Promise<void> {
        if (this.isMuted) return;

        try {
            const context = this.getContext();

            // Resume context if suspended (browser policy)
            if (context.state === 'suspended') {
                await context.resume();
            }

            const buffer = await this.loadBuffer(url);
            const source = context.createBufferSource();
            source.buffer = buffer;

            const gainNode = context.createGain();
            gainNode.gain.value = volume;

            source.connect(gainNode);
            gainNode.connect(context.destination);

            source.start(0);
            this.activeSources.add(source);

            return new Promise((resolve) => {
                source.onended = () => {
                    this.activeSources.delete(source);
                    resolve();
                };
            });
        } catch (error) {
            console.error(`Error playing sound ${url}:`, error);
        }
    }

    /**
     * Stops all currently playing sounds.
     */
    public stopAll(): void {
        this.activeSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore errors if source already stopped
            }
        });
        this.activeSources.clear();
    }

    /**
     * Mutes or unmutes all future sounds.
     */
    public setMuted(muted: boolean): void {
        this.isMuted = muted;
        if (muted) {
            this.stopAll();
        }
    }
}

export const audioService = AudioService.getInstance();
