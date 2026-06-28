#!/usr/bin/env python3
"""
Read an SRT file and output all text segments as a JSON array for AI translation.
The actual translation is done by the AI (WorkBuddy) in-context; this script
simply parses the SRT and outputs structured data.

Usage:
    python translate_subtitle.py <input.srt> [--output <json_path>] [--to en|ja|ko|fr|de|es|...]
"""

import argparse, json, os, re, sys


def parse_srt(srt_path: str) -> list[dict]:
    """Parse an SRT file into a list of segment dicts."""
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read().strip()

    blocks = re.split(r"\n\s*\n", content)
    segments = []

    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 3:
            continue
        ts_line = lines[1]
        text_lines = lines[2:]

        m = re.match(r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})", ts_line)
        if not m:
            continue

        segments.append({
            "index": int(lines[0]),
            "start": f"{m.group(1)}:{m.group(2)}:{m.group(3)},{m.group(4)}",
            "end":   f"{m.group(5)}:{m.group(6)}:{m.group(7)},{m.group(8)}",
            "text":  "\n".join(text_lines),
        })

    return segments


def main():
    parser = argparse.ArgumentParser(description="Parse SRT and output segments for AI translation")
    parser.add_argument("srt", help="Input SRT file")
    parser.add_argument("--output", "-o", default=None, help="Output JSON path")
    parser.add_argument("--to", "-t", default="en", help="Target language code (default: en)")
    args = parser.parse_args()

    segments = parse_srt(args.srt)
    result = {
        "source": os.path.basename(args.srt),
        "target_language": args.to,
        "count": len(segments),
        "segments": segments,
    }

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"JSON written: {args.output}")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))

    print(f"\nTotal segments: {len(segments)}")
    print("Paste the 'text' fields to the AI for translation, then write the translated SRT.")


if __name__ == "__main__":
    main()
