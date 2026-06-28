---
name: video-subtitle
description: >
  Add, generate, translate, or burn subtitles into a video. Use when the user wants
  to add hardcoded/burned-in subtitles, transcribe speech to SRT, translate
  existing subtitles to another language, or create dual-language subtitles
  (original + translation). Triggers: "给视频加字幕", "视频转字幕", "提取字幕",
  "翻译字幕", "烧录字幕", "硬字幕", "双语字幕", "双字幕", "subtitle a video",
  "transcribe video", "burn subtitles", "generate subtitles", "dual subtitle".
license: MIT
compatibility: Requires ffmpeg in PATH, Python 3, openai-whisper (`pip install openai-whisper`). First transcription downloads a Whisper model (~140MB for base).
metadata:
  version: "1.0"
  author: video-subtitle contributors
  category: media
  tags: [video, subtitle, whisper, ffmpeg, translation, srt, ass]
allowed-tools: Bash
when_to_use: |
  Use this skill whenever the user wants any of:
  - Transcribe a video's speech to timestamped subtitles (SRT)
  - Translate existing subtitles to another language
  - Hardcode/burn subtitles into a video (single or dual language)
  - Extract a video's audio for further processing
agent_created: true
---

# Video Subtitle Pipeline

Complete workflow for adding subtitles to videos:
**audio extraction → speech-to-text → translation → subtitle burning**.

## Prerequisites

- `ffmpeg` and `ffprobe` in PATH — verify with `ffmpeg -version`
- Python 3 with `openai-whisper` — `pip install openai-whisper`

> The scripts in `scripts/` are invoked with `python3 scripts/<name>.py`.
> In Claude Code, the env var `${CLAUDE_SKILL_DIR}` resolves to this skill's
> installed location. In other agents, use the relative path from SKILL.md.

## Workflow

### Step 1 — Extract Audio

Extract 16kHz mono WAV from video (best for Whisper accuracy):

```bash
python3 scripts/extract_audio.py "<VIDEO_PATH>" --output "<AUDIO_PATH>.wav"
```

If `--output` is omitted, defaults to `<video_stem>.wav`.

### Step 2 — Transcribe (Whisper)

Convert audio to a timestamped SRT:

```bash
python3 scripts/transcribe.py "<AUDIO_PATH>" --model base --output "<SUBTITLE_PATH>.srt"
```

Models: `tiny` (fastest) · `base` (good default) · `small` · `medium` · `large` (best accuracy).
First run downloads the model (~140MB for `base`); subsequent runs use the cache.
The script prints the detected language — use this to decide if translation is needed.

### Step 3 — Translate (AI-driven)

If the detected language differs from the target, translate the SRT in-place:

1. Read the generated `.srt` to get all segments with timestamps.
2. Translate each segment's text to the target language, preserving the SRT
   structure exactly (index, timestamps unchanged).
3. Write the translated SRT to `<original_stem>.<target_lang>.srt`.

`scripts/translate_subtitle.py` can parse the SRT into a structured JSON first
if the model prefers structured data over raw text.

### Step 4 — Burn Subtitles

#### 4a. Single Subtitle Mode

```bash
python3 scripts/burn_subtitle.py "<VIDEO_PATH>" "<SUBTITLE_PATH>.srt" \
    --output "<OUTPUT>.mp4" --style default
```

Style presets:

| Preset | Description |
|---|---|
| `default` | White text 18pt, thin outline, semi-transparent background box (clean modern look) |
| `streaming` | White text 16pt, background box — Netflix-style |
| `white_shadow` | Larger white text 20pt, stronger shadow — good for dark videos |
| `yellow_black` | Yellow text 20pt — traditional high contrast |
| `minimal` | Small white text 16pt, very thin outline — least intrusive |

Custom styles: `--custom "FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000"`

#### 4b. Dual Subtitle Mode (Original + Translation)

Burn both the original and the translated SRT — original on top, translation below:

```bash
python3 scripts/burn_dual_subtitle.py "<VIDEO_PATH>" "<ORIGINAL>.srt" "<TRANSLATED>.srt" \
    --output "<OUTPUT>.mp4"
```

Generates a combined ASS file (auto-cleaned) with two styles:
- **Original** (top): PingFang SC 18pt white, semi-transparent black background, MarginV=60
- **Translated** (bottom): Helvetica 16pt light green-white, semi-transparent black background, MarginV=18

## Complete Pipeline Example

User says: *"帮我把 lecture.mp4 生成中英双语字幕"*

```
1. scripts/extract_audio.py  lecture.mp4                    → lecture.wav
2. scripts/transcribe.py     lecture.wav --model base       → lecture.srt
   (script prints: Detected language: zh)
3. AI translates lecture.srt → lecture.english.srt
4. scripts/burn_dual_subtitle.py lecture.mp4 \
       lecture.srt lecture.english.srt                      → lecture.dual.mp4
```

## Notes

- ffmpeg's `subtitles` filter uses libass. ASS font names must match installed
  system fonts. On macOS, `PingFang SC` and `Helvetica` are universally available.
  On Linux, install `fonts-noto-cjk` (Debian/Ubuntu) or `noto-fonts-cjk` (Arch).
- On Windows, prefer `Microsoft YaHei` or `SimHei`. Pass via
  `--custom "FontName=Microsoft YaHei,..."`.
- For videos in sandboxed directories (e.g. Desktop), write intermediate files
  to a writable workspace and copy the final output back.
- Whisper model downloads are cached in `~/.cache/whisper/` — subsequent runs
  skip the download.
- `BorderStyle=4` + `BackColour` creates a semi-transparent background box
  behind each subtitle line, improving readability on bright footage.

## Troubleshooting

| Problem | Fix |
|---|---|
| `ffmpeg: command not found` | Install ffmpeg and ensure it is on `PATH` |
| `ModuleNotFoundError: whisper` | `pip install openai-whisper` (also needs `ffmpeg`) |
| Subtitles invisible | The ffmpeg `subtitles=` filter requires the SRT path to be **absolute and free of special characters**. Pass the absolute path. |
| Wrong font rendered on Linux | Install the font (`apt install fonts-noto-cjk`) or pass `--custom "FontName=Noto Sans CJK SC,..."` |
| Chinese characters render as boxes | Install CJK fonts; on macOS the bundled `PingFang SC` works out of the box |
