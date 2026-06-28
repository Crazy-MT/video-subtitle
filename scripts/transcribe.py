#!/usr/bin/env python3
"""
Transcribe audio to SRT subtitles using OpenAI Whisper.
Automatically detects language and generates timestamped SRT.

Usage:
    python transcribe.py <audio_path> [--model base|small|medium|large] [--output <srt_path>]
"""

import argparse, os, subprocess, sys


def srt_time(seconds: float) -> str:
    """Convert float seconds to SRT timestamp HH:MM:SS,mmm."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    parser = argparse.ArgumentParser(description="Transcribe audio to SRT using OpenAI Whisper")
    parser.add_argument("audio", help="Input audio file (WAV, 16kHz mono recommended)")
    parser.add_argument("--model", "-m", default="base", choices=["tiny", "base", "small", "medium", "large"],
                        help="Whisper model size (default: base)")
    parser.add_argument("--output", "-o", default=None, help="Output SRT path (default: <audio_stem>.srt)")
    parser.add_argument("--language", "-l", default=None, help="Force language (e.g. zh, en). Auto-detect if omitted.")
    args = parser.parse_args()

    if not os.path.isfile(args.audio):
        print(f"Error: audio not found: {args.audio}")
        sys.exit(1)

    if args.output is None:
        base = os.path.splitext(args.audio)[0]
        args.output = f"{base}.srt"

    # Lazy import — whisper is heavy
    import whisper

    print(f"Loading Whisper model: {args.model} ...")
    model = whisper.load_model(args.model)

    transcribe_opts = {}
    if args.language:
        transcribe_opts["language"] = args.language

    print("Transcribing (this may take a while) ...")
    result = model.transcribe(args.audio, **transcribe_opts)

    detected_lang = result.get("language", "unknown")
    print(f"Detected language: {detected_lang}")

    segments = result.get("segments", [])
    print(f"Segments found: {len(segments)}")

    with open(args.output, "w", encoding="utf-8") as f:
        for i, seg in enumerate(segments, 1):
            start = srt_time(seg["start"])
            end   = srt_time(seg["end"])
            text  = seg["text"].strip()
            f.write(f"{i}\n{start} --> {end}\n{text}\n\n")

    print(f"SRT written: {args.output}")
    print(f"Language: {detected_lang}")


if __name__ == "__main__":
    main()
