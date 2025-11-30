#!/usr/bin/env python3
"""
Generate robotic AI voices for workout activities and sentences using Kokoro TTS and Pedalboard effects.
"""

import os
import json
from pathlib import Path
from kokoro_onnx import Kokoro
# Added Bitcrush, Phaser, Compressor, HighpassFilter
from pedalboard import Pedalboard, Chorus, Reverb, PitchShift, HighpassFilter, Bitcrush, Phaser, Compressor, Gain
from pedalboard.io import AudioFile
import numpy as np


def apply_robotic_effect(audio_data: np.ndarray, sample_rate: int) -> np.ndarray:
    """
    Apply "Sci-Fi AI" voice effects.
    """
    board = Pedalboard([
        # 1. Clean up mud (FIXED parameter name here)
        HighpassFilter(cutoff_frequency_hz=100),
        
        # 2. Slight Pitch Shift 
        PitchShift(semitones=-1.5),
        
        # 3. Bitcrush for digital texture
        Bitcrush(bit_depth=8),
        
        # 4. Phaser for metallic sweep
        Phaser(rate_hz=2.0, depth=0.4, feedback=0.3, mix=0.4),
        
        # 5. Tight Chorus for width
        Chorus(rate_hz=5.0, depth=0.1, centre_delay_ms=5.0, mix=0.3),

        # 6. Reverb for space
        Reverb(room_size=0.5, damping=0.5, wet_level=0.3, dry_level=0.7),
        
        # 7. Compressor to glue it together
        Compressor(threshold_db=-15, ratio=4),
        
        # 8. Gain staging
        Gain(gain_db=3.0)
    ])
    
    # Apply effects
    processed_audio = board(audio_data, sample_rate)
    
    return processed_audio


def extract_activity_names(workout_dir: Path) -> set:
    """Extract unique activity names from all workout JSON files."""
    activity_names = set()
    
    for json_file in workout_dir.glob("*.json"):
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for activity in data.get('activities', []):
                name = activity.get('name')
                if name:
                    activity_names.add(name)
    
    return activity_names


def extract_sentences(sentences_file: Path) -> list:
    """Extract sentences from the sentences.json file."""
    if not sentences_file.exists():
        return []
    
    with open(sentences_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return data if isinstance(data, list) else []


def sanitize_filename(name: str) -> str:
    """Convert activity name to safe filename."""
    return name.lower().replace(' ', '-').replace('_', '-')


def main():
    """Main function to generate voices."""

    voice_name = "heart"
    
    # Define paths
    project_root = Path(__file__).parent
    workout_dir = project_root / "src" / "lib" / "data" / "workouts"
    sentences_file = project_root / "src" / "lib" / "data" / "sentences.json"
    activity_output_dir = project_root / "static" / "audio" / "voice" / voice_name
    sentence_output_dir = project_root / "static" / "audio" / "voice" / voice_name
    
    activity_output_dir.mkdir(parents=True, exist_ok=True)
    sentence_output_dir.mkdir(parents=True, exist_ok=True)
    
    print("Extracting activity names and sentences...")
    activity_names = extract_activity_names(workout_dir)
    sentences = extract_sentences(sentences_file)
    
    # Model files
    model_file = project_root / "kokoro-v1.0.onnx"
    voices_file = project_root / "voices-v1.0.bin"
    
    if not model_file.exists() or not voices_file.exists():
        print("ERROR: Model files not found in project root.")
        return
    
    print("\nInitializing Kokoro TTS engine...")
    kokoro = Kokoro(str(model_file), str(voices_file))
    voice = f"af_{voice_name}" 
    
    items_to_process = []
    
    for activity_name in sorted(activity_names):
        filename = sanitize_filename(activity_name)
        output_path = activity_output_dir / f"{filename}.mp3"
        items_to_process.append((activity_name, output_path, "activity", ""))
    
    for sentence in sentences:
        filename = sanitize_filename(sentence)
        output_path = sentence_output_dir / f"{filename}.mp3"
        items_to_process.append((sentence, output_path, "sentence", ""))
    
    print(f"\nProcessing {len(items_to_process)} items...\n")
    
    for text, output_path, item_type, prefix in items_to_process:
        
        # Skip if already exists
        if output_path.exists():
            print(f"  - Exists: {output_path.name}")
            continue
        
        try:
            print(f"  > Generating: {text}")

            # --- FIX FOR KOKORO INTONATION ---
            # Append a period to force 'statement' intonation.
            # Otherwise "Pushups" sounds like "Pushups?"
            text_to_speak = prefix + text.strip()
            if not text_to_speak.endswith(('.', '!', '?')):
                text_to_speak += "."

            audio_data, sample_rate = kokoro.create(
                text_to_speak,
                voice=voice,
                speed=0.8,
                lang='en-us'
            )
            
            if not isinstance(audio_data, np.ndarray):
                audio_data = np.array(audio_data, dtype=np.float32)
            
            if audio_data.ndim == 1:
                audio_data = audio_data.reshape(1, -1)
            elif audio_data.ndim == 2 and audio_data.shape[0] > audio_data.shape[1]:
                audio_data = audio_data.T

            silence_duration_sec = 0.5
            silent_samples_count = int(sample_rate * silence_duration_sec)

            num_channels = audio_data.shape[0]
            silence_array = np.zeros((num_channels, silent_samples_count), dtype=audio_data.dtype)

            audio_data_with_silence = np.concatenate([audio_data, silence_array], axis=1)
            
            # Apply fixed effects
            processed_audio = apply_robotic_effect(audio_data_with_silence, sample_rate)
            
            with AudioFile(str(output_path), 'w', sample_rate, num_channels=processed_audio.shape[0]) as f:
                f.write(processed_audio)
            
        except Exception as e:
            print(f"  X Error: {e}")
            continue
    
    print("\nDone.")

if __name__ == "__main__":
    main()