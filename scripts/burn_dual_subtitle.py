#!/usr/bin/env python3
"""
Dual-subtitle burner: burns two SRT files into a video — original on top, translation below.
Generates a combined ASS (Advanced SubStation Alpha) file with distinct styles per track,
then uses ffmpeg to hardcode it.

Usage:
    python burn_dual_subtitle.py <video> <original.srt> <translated.srt> [--output <path>]
"""

import argparse, os, subprocess, sys, re, textwrap, platform

# Font fallback for cross-platform rendering.
# ASS font names are platform-dependent:
#   - macOS:   PingFang SC, Helvetica
#   - Windows: Microsoft YaHei (or SimHei), Arial
#   - Linux:   Noto Sans CJK SC (after `apt install fonts-noto-cjk`), DejaVu Sans
def _orig_font():
    sysname = platform.system()
    if sysname == "Windows":
        return "Microsoft YaHei"
    if sysname == "Linux":
        return "Noto Sans CJK SC"
    return "PingFang SC"

def _trans_font():
    sysname = platform.system()
    if sysname == "Windows":
        return "Arial"
    if sysname == "Linux":
        return "DejaVu Sans"
    return "Helvetica"

# ── helpers ──────────────────────────────────────────────────────────────

def srt_to_ass_events(srt_path, style_name="Default", layer=0):
    """Parse an SRT and return a list of ASS Dialogue lines."""
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read().strip()

    blocks = re.split(r"\n\s*\n", content)
    events = []

    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 3:
            continue
        # first line is index (skip), second is timestamp, rest is text
        ts_line = lines[1]
        text_lines = lines[2:]

        m = re.match(r"(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})", ts_line)
        if not m:
            continue

        start = f"{m.group(1)}:{m.group(2)}:{m.group(3)}.{m.group(4)[:2]}"  # ASS uses centiseconds
        end   = f"{m.group(5)}:{m.group(6)}:{m.group(7)}.{m.group(8)[:2]}"

        # Join text lines, escape ASS special chars
        text = "\\N".join(text_lines)
        text = text.replace("{", "\\{").replace("}", "\\}")

        # Wrap long lines
        events.append(
            f"Dialogue: {layer},{start},{end},{style_name},,0,0,0,,{text}"
        )

    return events

def wrap_text(text, max_width):
    """Word-wrap a single line of text."""
    if len(text) <= max_width:
        return text
    # Try to wrap at spaces
    words = text.split()
    lines = []
    current = ""
    for word in words:
        if len(current) + len(word) + 1 <= max_width:
            current = (current + " " + word).strip()
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return "\\N".join(lines) if lines else text


def build_ass(video_width, video_height, original_srt, translated_srt,
              orig_label="Original", trans_label="Translated"):
    """Build a complete ASS file string."""

    # Style: original on top (higher MarginV), translation on bottom (lower MarginV)
    # Alignment=2 = bottom-center

    # Resolve platform-specific font names at module level.
    ORIG_FONT = _orig_font()
    TRANS_FONT = _trans_font()

    ass_header = f"""[Script Info]
Title: Dual Subtitles
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Orig,{ORIG_FONT},18,&H00FFFFFF,&H000000FF,&H00222222,&H88000000,0,0,0,0,100,100,0,0,1,1.2,0,2,30,30,60,1
Style: Trans,{TRANS_FONT},16,&H00CCFFCC,&H000000FF,&H00222222,&H88000000,0,0,0,0,100,100,0,0,1,1.2,0,2,30,30,18,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    orig_events = srt_to_ass_events(original_srt, style_name="Orig", layer=0)
    trans_events = srt_to_ass_events(translated_srt, style_name="Trans", layer=1)

    # Combine and sort by start time
    all_events = []
    for e in orig_events:
        # Extract start time for sorting
        parts = e.split(",")
        all_events.append((parts[1], e))
    for e in trans_events:
        parts = e.split(",")
        all_events.append((parts[1], e))

    all_events.sort(key=lambda x: x[0])

    return ass_header + "\n".join(e[1] for e in all_events) + "\n"


def get_video_dimensions(video_path):
    """Get video width and height via ffprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0",
        video_path
    ]
    out = subprocess.check_output(cmd, text=True).strip()
    w, h = out.split(",")
    return int(w), int(h)


# ── main ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Burn two SRT subtitles into a video")
    parser.add_argument("video", help="Input video file")
    parser.add_argument("original_srt", help="Original-language SRT (displayed on top)")
    parser.add_argument("translated_srt", help="Translated SRT (displayed on bottom)")
    parser.add_argument("--output", "-o", default=None, help="Output video path")
    parser.add_argument("--orig-label", default="Original", help="Label for original style")
    parser.add_argument("--trans-label", default="Translated", help="Label for translated style")
    args = parser.parse_args()

    if args.output is None:
        base, ext = os.path.splitext(args.video)
        args.output = f"{base}.dual.mp4"

    print(f"Video: {args.video}")
    print(f"Original SRT: {args.original_srt}")
    print(f"Translated SRT: {args.translated_srt}")
    print(f"Output: {args.output}")

    # Get video dimensions
    w, h = get_video_dimensions(args.video)
    print(f"Video dimensions: {w}x{h}")

    # Build ASS
    ass_content = build_ass(w, h, args.original_srt, args.translated_srt,
                            args.orig_label, args.trans_label)

    # Write temp ASS file
    ass_path = args.output.replace(".mp4", ".ass").replace(".dual", "")
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass_content)
    print(f"ASS file written: {ass_path}")

    # Burn with ffmpeg. Pass absolute forward-slash paths to avoid libass
    # parser issues on Windows (backslashes and drive-letter colons).
    abs_video = os.path.abspath(args.video).replace("\\", "/")
    abs_ass = os.path.abspath(ass_path).replace("\\", "/")
    abs_output = os.path.abspath(args.output).replace("\\", "/")
    cmd = [
        "ffmpeg", "-y",
        "-i", abs_video,
        "-vf", f"ass={abs_ass}",
        "-c:v", "libx264",
        "-crf", "20",
        "-preset", "medium",
        "-c:a", "copy",
        abs_output,
    ]

    print("Running ffmpeg...")
    subprocess.run(cmd, check=True)

    # Cleanup temp ASS
    os.remove(ass_path)

    print(f"\nDone → {args.output}")
    print(f"File size: {os.path.getsize(args.output) / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
