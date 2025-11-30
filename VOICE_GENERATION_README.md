# Voice Generation

This script generates robotic AI voices for workout activity names and sentences using Kokoro TTS and Pedalboard audio effects.

## Setup

### 1. Create Virtual Environment

```powershell
python -m venv .venv
```

### 2. Install Dependencies

```powershell
.\.venv\Scripts\pip install kokoro-onnx pedalboard numpy
```

Or install from requirements file:

```powershell
.\.venv\Scripts\pip install -r requirements-voice.txt
```

### 3. Download Model Files

Download these files and place them in the project root directory:

- [kokoro-v1.0.onnx](https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx) (~310 MB)
- [voices-v1.0.bin](https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin) (~28 MB)

**PowerShell commands:**
```powershell
Invoke-WebRequest -Uri "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx" -OutFile "kokoro-v1.0.onnx"
Invoke-WebRequest -Uri "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin" -OutFile "voices-v1.0.bin"
```

## Usage

Run the voice generation script:

```powershell
.\.venv\Scripts\python generate_workout_voices.py
```

The script will:
1. Extract all unique activity names from JSON files in `src/lib/data/workouts/`
2. Generate speech for each activity using the Kokoro "af_sky" voice
3. Apply robotic voice effects using Pedalboard (pitch shift, chorus, distortion, filtering, reverb)
4. Save the processed audio files to `static/audio/voice/sky/`

## Output

Voice files are saved as:
- Format: WAV
- Sample Rate: 24000 Hz
- Location: `static/audio/voice/sky/`
- Naming: Activity names converted to lowercase with hyphens (e.g., "High Knees" → "high-knees.mp3")

## Features

### Kokoro TTS
- Voice: `af_sky` (American Female - Sky)
- Speed: 1.0x
- Language: English (US)

### Robotic Effects (Pedalboard)
- **Pitch Shift**: -1.5 semitones for a deeper, more mechanical sound
- **Chorus**: Creates a layered, synthetic quality
- **Distortion**: Adds edge and character to the voice
- **Ladder Filter**: High-pass filtering for a cleaner, more synthetic tone
- **Reverb**: Subtle spatial effect

## Customization

To use a different voice, modify the `voice` variable in `generate_workout_voices.py`:

```python
voice = "af_sky"  # Change to another voice like "af_sarah", "am_adam", etc.
```

See available voices at: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md

## Note

The script will skip generating voices for activities that already have audio files, making it safe to run multiple times.
