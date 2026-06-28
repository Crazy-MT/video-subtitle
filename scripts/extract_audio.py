#!/usr/bin/env python3
"""
Extract audio from a video file using ffmpeg.
Outputs 16kHz mono WAV suitable for Whisper ASR.

Usage:
    python extract_audio.py <video_path> [--output <audio_path>]
"""

import argparse, os, subprocess, sys


def main():
    parser = argparse.ArgumentParser(description="Extract audio from video for ASR")
    parser.add_argument("video", help="Input video file")
    parser.add_argument("--output", "-o", default=None, help="Output WAV path (default: <video_stem>.wav)")
    args = parser.parse_args()

    if not os.path.isfile(args.video):
        print(f"Error: video not found: {args.video}")
        sys.exit(1)

    if args.output is None:
        base = os.path.splitext(args.video)[0]
        args.output = f"{base}.wav"

    cmd = [
        "ffmpeg", "-y",
        "-i", args.video,
        "-vn",                # no video
        "-acodec", "pcm_s16le",
        "-ar", "16000",       # 16kHz sample rate
        "-ac", "1",           # mono
        args.output
    ]

    print(f"Extracting audio: {args.video} → {args.output}")
    subprocess.run(cmd, check=True)
    size_mb = os.path.getsize(args.output) / 1024 / 1024
    print(f"Done: {args.output} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
