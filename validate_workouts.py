#!/usr/bin/env python3
"""
Workout Validation Script

This script validates that all workout activities have corresponding
audio (mp3) and image (webp) files in the expected locations.
"""

import json
import os
import sys
from pathlib import Path
from typing import Set, List, Tuple

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


def normalize_activity_name(name: str) -> str:
    """
    Convert activity name to lowercase with dashes.
    Example: "Split Jacks" -> "split-jacks"
    """
    return name.lower().replace(" ", "-")


def get_all_activity_names(workouts_dir: Path) -> dict:
    """
    Scan all workout JSON files and extract activity names with their day references.
    Returns dict mapping activity name to list of day IDs.
    """
    activity_to_days = {}
    
    # Find all day*.json files
    json_files = sorted(workouts_dir.glob("day*.json"))
    
    if not json_files:
        print(f"⚠️  No workout JSON files found in {workouts_dir}")
        return activity_to_days
    
    print(f"📋 Scanning {len(json_files)} workout files...")
    
    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            day_id = json_file.stem  # e.g., "day01"
            
            if 'activities' in data:
                for activity in data['activities']:
                    if 'name' in activity:
                        name = activity['name']
                        if name not in activity_to_days:
                            activity_to_days[name] = []
                        if day_id not in activity_to_days[name]:
                            activity_to_days[name].append(day_id)
        except Exception as e:
            print(f"❌ Error reading {json_file.name}: {e}")
    
    print(f"✅ Found {len(activity_to_days)} unique activities\n")
    return activity_to_days


def validate_files(activity_to_days: dict, audio_dir: Path, image_dir: Path) -> Tuple[List[str], List[str]]:
    """
    Check if all required audio and image files exist.
    Returns tuple of (missing_audio, missing_images).
    """
    missing_audio = []
    missing_images = []
    
    print("🔍 Validating files...\n")
    
    for name in sorted(activity_to_days.keys()):
        normalized = normalize_activity_name(name)
        days = ", ".join(activity_to_days[name])
        
        # Check audio file
        audio_file = audio_dir / f"{normalized}.mp3"
        if not audio_file.exists():
            missing_audio.append(f"  ❌ {name} (used in: {days})\n     → {audio_file}")
        
        # Check image file
        image_file = image_dir / f"{normalized}.webp"
        if not image_file.exists():
            missing_images.append(f"  ❌ {name} (used in: {days})\n     → {image_file}")
    
    return missing_audio, missing_images


def main():
    """Main validation function."""
    # Define paths relative to script location
    script_dir = Path(__file__).parent
    workouts_dir = script_dir / "src" / "lib" / "data" / "workouts"
    audio_dir = script_dir / "static" / "audio" / "voice" / "heart"
    image_dir = script_dir / "static" / "activities"
    
    print("=" * 60)
    print("🏋️  WORKOUT FILES VALIDATION")
    print("=" * 60)
    print()
    
    # Check if directories exist
    if not workouts_dir.exists():
        print(f"❌ Workouts directory not found: {workouts_dir}")
        return 1
    
    if not audio_dir.exists():
        print(f"⚠️  Audio directory not found: {audio_dir}")
        print(f"   Creating directory...")
        audio_dir.mkdir(parents=True, exist_ok=True)
    
    if not image_dir.exists():
        print(f"⚠️  Image directory not found: {image_dir}")
        print(f"   Creating directory...")
        image_dir.mkdir(parents=True, exist_ok=True)
    
    print()
    
    # Get all activity names
    activity_to_days = get_all_activity_names(workouts_dir)
    
    if not activity_to_days:
        print("❌ No activities found!")
        return 1
    
    # Validate files
    missing_audio, missing_images = validate_files(activity_to_days, audio_dir, image_dir)
    
    # Report results
    print("=" * 60)
    print("📊 VALIDATION RESULTS")
    print("=" * 60)
    print()
    
    if missing_audio:
        print(f"🔊 Missing Audio Files ({len(missing_audio)}):")
        for item in missing_audio:
            print(item)
        print()
    else:
        print("✅ All audio files present!")
        print()
    
    if missing_images:
        print(f"🖼️  Missing Image Files ({len(missing_images)}):")
        for item in missing_images:
            print(item)
        print()
    else:
        print("✅ All image files present!")
        print()
    
    # Summary
    total_missing = len(missing_audio) + len(missing_images)
    if total_missing > 0:
        print("=" * 60)
        print(f"❌ VALIDATION FAILED: {total_missing} files missing")
        print("=" * 60)
        return 1
    else:
        print("=" * 60)
        print("✅ VALIDATION PASSED: All files present!")
        print("=" * 60)
        return 0


if __name__ == "__main__":
    exit(main())
