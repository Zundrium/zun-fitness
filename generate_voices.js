import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { KokoroTTS } from 'kokoro-js';
import WavEncoder from 'wav-encoder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const VOICE_NAME = 'heart'; // Using 'heart' voice as in the Python script
const MODEL_ID = 'onnx-community/Kokoro-82M-ONNX';
const OUTPUT_DIR = path.join(__dirname, 'static', 'audio', 'voice', VOICE_NAME);

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Paths
const WORKOUT_DIR = path.join(__dirname, 'src', 'lib', 'data', 'workouts');
const SENTENCES_FILE = path.join(__dirname, 'src', 'lib', 'data', 'sentences.json');

/**
 * Sanitize text for use as a filename.
 */
function sanitizeFilename(text) {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-').replace(/[^a-z0-9-&]/g, '');
}

/**
 * Extract unique activity names from workout JSON files.
 */
function extractActivityNames() {
    const activityNames = new Set();
    if (fs.existsSync(WORKOUT_DIR)) {
        const files = fs.readdirSync(WORKOUT_DIR).filter(file => file.endsWith('.json'));
        for (const file of files) {
            const filePath = path.join(WORKOUT_DIR, file);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                if (data.activities) {
                    for (const activity of data.activities) {
                        if (activity.name) {
                            activityNames.add(activity.name);
                        }
                    }
                }
            } catch (err) {
                console.error(`Error reading ${file}:`, err);
            }
        }
    }
    return Array.from(activityNames);
}

/**
 * Extract sentences from sentences.json.
 */
function extractSentences() {
    if (fs.existsSync(SENTENCES_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(SENTENCES_FILE, 'utf-8'));
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('Error reading sentences.json:', err);
            return [];
        }
    }
    return [];
}

/**
 * Convert raw audio data to WAV buffer.
 */
async function encodeWav(audioData, sampleRate) {
    return WavEncoder.encode({
        sampleRate: sampleRate,
        channelData: [audioData] // Mono
    });
}

/**
 * Apply robotic effects and convert to M4A using FFmpeg.
 */
function processAudio(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        // FFmpeg filter chain to approximate the Python script's Pedalboard effects:
        // Phaser: rate=2.0, depth=0.4, feedback=0.3 (approx decay)
        // Chorus: rate=5.0, depth=0.1, delay=5ms, mix=0.3
        // Reverb: room=0.5, damp=0.5, wet=0.3

        // Note: FFmpeg filters are different from Pedalboard, so this is an approximation.
        // aphaser=in_gain=0.6:out_gain=0.6:delay=3.0:decay=0.3:speed=2.0:type=t
        // chorus=0.7:0.3:5:0.1:5:2 (in_gain, out_gain, delays, decays, speeds, depths)
        // aecho=0.8:0.88:60:0.4 (simple reverb/echo)

        const filterComplex = [
            'aphaser=in_gain=0.8:out_gain=0.6:delay=3.0:decay=0.3:speed=2.0:type=t',
            'chorus=0.7:0.3:5:0.1:5:2',
            'aecho=0.8:0.9:50:0.3',
            'volume=12.0'
        ].join(',');

        const args = [
            '-y', // Overwrite
            '-i', inputPath,
            '-filter_complex', filterComplex,
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            outputPath
        ];

        const ffmpeg = spawn('ffmpeg', args);

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg exited with code ${code}`));
            }
        });

        ffmpeg.on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    console.log('Starting voice generation...');

    // 1. Initialize TTS
    console.log(`Loading model ${MODEL_ID}...`);
    const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: "fp32", // Use fp32 for compatibility
    });

    // 2. Gather items to process
    const items = [];

    // Activities
    const activities = extractActivityNames();
    console.log(`Found ${activities.length} activities.`);
    activities.forEach(name => {
        items.push({
            text: name,
            filename: sanitizeFilename(name),
            type: 'activity'
        });
    });

    // Sentences
    const sentences = extractSentences();
    console.log(`Found ${sentences.length} sentences.`);
    sentences.forEach(text => {
        items.push({
            text: text,
            filename: sanitizeFilename(text),
            type: 'sentence'
        });
    });

    // Numbers 0-50
    console.log('Adding numbers 0-50...');
    for (let i = 0; i <= 50; i++) {
        items.push({
            text: i.toString(),
            filename: i.toString(),
            type: 'number'
        });
    }

    console.log(`Total items to process: ${items.length}`);

    // 3. Process items
    for (const item of items) {
        const outputPath = path.join(OUTPUT_DIR, `${item.filename}.m4a`);

        if (fs.existsSync(outputPath)) {
            console.log(`Skipping (exists): ${item.filename}`);
            continue;
        }

        console.log(`Generating: ${item.text}`);

        try {
            // Add punctuation to force statement intonation if needed
            let textToSpeak = item.text.trim();
            if (!/[.!?]$/.test(textToSpeak)) {
                textToSpeak += '.';
            }

            // Generate audio
            // Kokoro-js returns raw audio data
            const audio = await tts.generate(textToSpeak, {
                voice: `af_${VOICE_NAME}`,
            });

            // audio is likely an object with { audio: Float32Array, sampling_rate: number }
            // or just the array depending on version. 
            // Based on typical transformers.js / kokoro-js patterns:
            const rawAudio = audio.audio;
            const sampleRate = audio.sampling_rate;

            // Save to temp WAV
            const wavBuffer = await encodeWav(rawAudio, sampleRate);
            const tempWavPath = path.join(OUTPUT_DIR, `${item.filename}_temp.wav`);
            fs.writeFileSync(tempWavPath, Buffer.from(wavBuffer));

            // Process with FFmpeg
            await processAudio(tempWavPath, outputPath);

            // Cleanup temp file
            fs.unlinkSync(tempWavPath);

        } catch (err) {
            console.error(`Error processing ${item.text}:`, err);
        }
    }

    console.log('Done!');
}

main().catch(console.error);
