#!/usr/bin/env bash
#
# full-pipeline.sh — Run the complete video-subtitle pipeline from a single video.
#
# Usage:
#   ./examples/full-pipeline.sh <video> <target_lang> [--style <preset>]
#
# Example:
#   ./examples/full-pipeline.sh lecture.mp4 en --style default
#
# Outputs (under ./output/):
#   <video_stem>.wav              — extracted audio
#   <video_stem>.srt              — original-language SRT (Whisper)
#   <video_stem>.<target_lang>.srt — translated SRT (you must translate this manually
#                                    or have your agent do it before re-running step 4)
#   <video_stem>.dual.mp4         — final video with dual subtitles

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <video> <target_lang> [--style <preset>]"
  exit 1
fi

VIDEO="$1"
TARGET_LANG="$2"
STYLE="${4:-default}"   # $3 is the literal "--style" flag
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

STEM="$(basename "$VIDEO" | sed 's/\.[^.]*$//')"
OUT_DIR="$SKILL_DIR/output"
mkdir -p "$OUT_DIR"

echo "▶ Step 1/3 — Extract audio"
python3 "$SKILL_DIR/scripts/extract_audio.py" "$VIDEO" --output "$OUT_DIR/$STEM.wav"

echo "▶ Step 2/3 — Transcribe (Whisper base)"
python3 "$SKILL_DIR/scripts/transcribe.py" "$OUT_DIR/$STEM.wav" --model base --output "$OUT_DIR/$STEM.srt"

echo "▶ Step 3/3 — Burn (will fail if translated SRT does not exist yet)"
if [[ -f "$OUT_DIR/$STEM.$TARGET_LANG.srt" ]]; then
  python3 "$SKILL_DIR/scripts/burn_dual_subtitle.py" \
    "$VIDEO" \
    "$OUT_DIR/$STEM.srt" \
    "$OUT_DIR/$STEM.$TARGET_LANG.srt" \
    --output "$OUT_DIR/$STEM.dual.mp4"
  echo "✓ Dual subtitle video: $OUT_DIR/$STEM.dual.mp4"
else
  echo "⚠ Translated SRT not found at $OUT_DIR/$STEM.$TARGET_LANG.srt"
  echo "  Translate $OUT_DIR/$STEM.srt manually or with your AI agent, then re-run step 3."
  echo "  For now, burning single-language subtitle instead..."
  python3 "$SKILL_DIR/scripts/burn_subtitle.py" \
    "$VIDEO" "$OUT_DIR/$STEM.srt" \
    --output "$OUT_DIR/$STEM.subtitled.mp4" \
    --style "$STYLE"
  echo "✓ Single subtitle video: $OUT_DIR/$STEM.subtitled.mp4"
fi

echo "Done."
