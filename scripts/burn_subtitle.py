#!/usr/bin/env python3
"""
Burn (hardcode) an SRT subtitle into a video using ffmpeg's subtitles filter.
Supports multiple style presets.

Usage:
    python burn_subtitle.py <video> <srt_path> [--output <output_video>] [--style <preset>]
    python burn_subtitle.py <video> <srt_path> --custom "FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000"

Style presets:
    default     - White text 18pt, thin outline, semi-transparent background box (clean modern look)
    streaming   - White text 16pt, thin outline, background box (Netflix-style)
    white_shadow - Larger white text 20pt, stronger shadow, no box — good for dark videos
    yellow_black - Yellow text 20pt, black outline — traditional high contrast
    minimal     - Small white text 16pt, very thin outline — least intrusive
"""

import argparse, os, subprocess, sys, platform

# Font fallback for cross-platform rendering.
# PingFang SC is macOS-only; Windows users should use Microsoft YaHei / SimHei.
def default_font():
    sysname = platform.system()
    if sysname == "Darwin":
        return "PingFang SC"
    if sysname == "Windows":
        return "Microsoft YaHei"
    # Linux: prefer Noto CJK if installed (it usually is, with fonts-noto-cjk).
    # Fall through to Helvetica, which is available on most distros.
    return "Noto Sans CJK SC"

STYLE_PRESETS = {
    "default": {
        "FontName": default_font(),
        "FontSize": "18",
        "PrimaryColour": "&H00FFFFFF",
        "OutlineColour": "&H00222222",
        "BackColour": "&H88000000",
        "Outline": "1.2",
        "Shadow": "0",
        "BorderStyle": "4",
        "Alignment": "2",
        "MarginV": "40",
    },
    "streaming": {
        "FontName": default_font(),
        "FontSize": "16",
        "PrimaryColour": "&H00FFFFFF",
        "OutlineColour": "&H00222222",
        "BackColour": "&H88000000",
        "Outline": "1",
        "Shadow": "0",
        "BorderStyle": "4",
        "Alignment": "2",
        "MarginV": "30",
    },
    "white_shadow": {
        "FontName": default_font(),
        "FontSize": "20",
        "PrimaryColour": "&H00FFFFFF",
        "OutlineColour": "&H00000000",
        "BackColour": "&H00000000",
        "Outline": "2",
        "Shadow": "2",
        "BorderStyle": "1",
        "Alignment": "2",
        "MarginV": "40",
    },
    "yellow_black": {
        "FontName": default_font(),
        "FontSize": "20",
        "PrimaryColour": "&H0000FFFF",
        "OutlineColour": "&H00000000",
        "BackColour": "&H00000000",
        "Outline": "2.5",
        "Shadow": "0",
        "BorderStyle": "1",
        "Alignment": "2",
        "MarginV": "40",
    },
    "minimal": {
        "FontName": default_font(),
        "FontSize": "16",
        "PrimaryColour": "&H00FFFFFF",
        "OutlineColour": "&H00222222",
        "BackColour": "&H44000000",
        "Outline": "0.8",
        "Shadow": "0",
        "BorderStyle": "4",
        "Alignment": "2",
        "MarginV": "25",
    },
}


def build_force_style(style_dict: dict) -> str:
    return ",".join(f"{k}={v}" for k, v in style_dict.items())


def main():
    parser = argparse.ArgumentParser(description="Burn SRT subtitles into a video")
    parser.add_argument("video", help="Input video file")
    parser.add_argument("srt", help="SRT subtitle file")
    parser.add_argument("--output", "-o", default=None, help="Output video path")
    parser.add_argument("--style", "-s", default="default", choices=list(STYLE_PRESETS.keys()),
                        help="Style preset (default: default)")
    parser.add_argument("--custom", default=None, help="Custom ASS force_style string (overrides --style)")
    parser.add_argument("--crf", default="20", help="H.264 CRF quality (default: 20, lower=better)")
    parser.add_argument("--preset", default="medium", help="libx264 preset (default: medium)")
    args = parser.parse_args()

    if not os.path.isfile(args.video):
        print(f"Error: video not found: {args.video}")
        sys.exit(1)
    if not os.path.isfile(args.srt):
        print(f"Error: SRT not found: {args.srt}")
        sys.exit(1)

    if args.output is None:
        base, ext = os.path.splitext(args.video)
        args.output = f"{base}.subtitled{ext}"

    if args.custom:
        force_style = args.custom
    else:
        force_style = build_force_style(STYLE_PRESETS[args.style])

    print(f"Video:  {args.video}")
    print(f"SRT:    {args.srt}")
    print(f"Style:  {args.style}")
    print(f"Output: {args.output}")

    # Use subtitles filter with SRT (ffmpeg converts SRT to ASS internally)
    #
    # Cross-platform path handling: ffmpeg's libass parser is sensitive to
    # backslashes and drive-letter colons on Windows. We always pass an
    # absolute, forward-slash path.
    srt_for_filter = os.path.abspath(args.srt).replace("\\", "/")
    IS_WINDOWS = platform.system() == "Windows"

    cmd = [
        "ffmpeg", "-y",
        "-i", os.path.abspath(args.video),
        "-vf", f"subtitles={srt_for_filter}:force_style='{force_style}'",
        "-c:v", "libx264",
        "-crf", args.crf,
        "-preset", args.preset,
        "-c:a", "copy",
        args.output,
    ]

    print("Running ffmpeg...")
    subprocess.run(cmd, check=True)

    size_mb = os.path.getsize(args.output) / 1024 / 1024
    print(f"\nDone → {args.output} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
