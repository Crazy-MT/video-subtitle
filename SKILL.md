---
name: video-subtitle
description: |
  This skill should be used when the user wants to add, generate, or burn subtitles into a video.
  It supports the full subtitle pipeline: extracting audio from video with ffmpeg,
  transcribing speech to timestamped SRT subtitles using OpenAI Whisper,
  translating subtitles to a target language using AI, and hardcoding (burning) subtitles
  into the output video using ffmpeg. Supports single-subtitle and dual-subtitle (original + translation) modes.
  Each step can be run independently or as a complete pipeline.
  Trigger phrases include: "给视频加字幕", "视频转字幕", "提取字幕", "翻译字幕", "烧录字幕",
  "双语字幕", "双字幕", "subtitle a video", "transcribe video", "burn subtitles", "硬字幕",
  "generate subtitles", "dual subtitle".
agent_created: true
---

# Video Subtitle Pipeline

Complete workflow for adding subtitles to videos: audio extraction → speech-to-text → translation → subtitle burning.

## Prerequisites

- `ffmpeg` and `ffprobe` installed (check with `ffmpeg -version`)
- Python with `openai-whisper` installed (`pip install openai-whisper`)

## Workflow

### Step 1 — Extract Audio

Extract 16kHz mono WAV from video:

```
python scripts/extract_audio.py "VIDEO_PATH" --output "AUDIO_PATH.wav"
```

If no `--output` is given, defaults to `<video_stem>.wav`.

### Step 2 — Transcribe (Whisper)

Convert audio to timestamped SRT:

```
python scripts/transcribe.py "AUDIO_PATH" --model base --output "SUBTITLE_PATH.srt"
```

Models: `tiny` (fastest), `base` (good default), `small`, `medium`, `large` (best accuracy).
First run downloads the model (~140MB for base).
The script prints the detected language — use this to decide if translation is needed.

### Step 3 — Translate (AI)

If the detected language differs from the target language, translate the SRT:

1. Read the generated `.srt` file to get all segments with timestamps.
2. Translate each segment's text to the target language, preserving the SRT structure exactly (index, timestamps unchanged).
3. Write the translated SRT to `<original_stem>.<target_lang>.srt`.

See `scripts/translate_subtitle.py` to parse SRT into structured JSON first if needed.

### Step 4 — Burn Subtitles

#### Single Subtitle Mode

Burn one SRT into the video with a style preset:

```
python scripts/burn_subtitle.py "VIDEO_PATH" "SUBTITLE_PATH.srt" --output "OUTPUT.mp4" --style default
```

Style presets:

| Preset | Description |
|--------|-------------|
| `default` | White text 18pt, thin outline, semi-transparent background box (clean modern look) |
| `streaming` | White text 16pt, background box — Netflix-style |
| `white_shadow` | Larger white text 20pt, stronger shadow — good for dark videos |
| `yellow_black` | Yellow text 20pt — traditional high contrast |
| `minimal` | Small white text 16pt, very thin outline — least intrusive |

Custom styles: use `--custom "FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000"`.

#### Dual Subtitle Mode (Original + Translation)

Burn both original and translated SRTs — original on top, translation below:

```
python scripts/burn_dual_subtitle.py "VIDEO_PATH" "ORIGINAL.srt" "TRANSLATED.srt" --output "OUTPUT.mp4"
```

This generates a combined ASS (Advanced SubStation Alpha) file with two styles:
- **Original** (top): PingFang SC 18pt white, semi-transparent black background, MarginV=60
- **Translated** (bottom): Helvetica 16pt light green-white, semi-transparent black background, MarginV=18

The ASS file is auto-cleaned after burning. Output file: `<video_stem>.dual.mp4` by default.

## Complete Pipeline Example

User says: "帮我把 lecture.mp4 生成中英双语字幕"

Workflow:
1. `extract_audio.py lecture.mp4` → `lecture.wav`
2. `transcribe.py lecture.wav --model base` → `lecture.srt` (detects language)
3. AI translates the SRT → `lecture.english.srt`
4. `burn_dual_subtitle.py lecture.mp4 lecture.srt lecture.english.srt` → `lecture.dual.mp4`

## Notes

- The `subtitles` filter in ffmpeg uses libass for rendering. ASS font names must match installed system fonts.
- On macOS, "PingFang SC" and "Helvetica" are universally available.
- For videos in sandboxed directories (e.g. Desktop), write intermediate files to a writable workspace and copy the final output.
- Whisper model downloads are cached; subsequent runs skip the download.
- The `BorderStyle=4` + `BackColour` combination creates a semi-transparent background box behind each subtitle line, improving readability on bright footage.
