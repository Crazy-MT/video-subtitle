---
description: Add, generate, translate, or burn subtitles into a video. / 给视频加字幕、生成字幕、翻译字幕、烧录字幕。
allowed-tools: Bash, Read, Write, Edit
argument-hint: <action> [video_path] [options...]
---

# /video-subtitle — Video Subtitle Pipeline

A complete workflow for adding subtitles to videos: **audio extraction → speech-to-text → translation → subtitle burning**.

You have access to the `video-subtitle` skill. **Read `SKILL.md` first** to understand prerequisites, scripts, and style presets. Then follow the steps below.

## Arguments

The user invoked: `$ARGUMENTS`

Parse `$ARGUMENTS` to determine the action. Common shapes:

- `add <video>` — full pipeline: extract → transcribe → (translate) → burn
- `transcribe <video>` — extract audio and generate SRT only
- `translate <srt> <target_lang>` — translate an existing SRT
- `burn <video> <srt>` — burn a single SRT into the video
- `burn-dual <video> <srt1> <srt2>` — burn original + translated (dual subtitle mode)
- `style-presets` — list all available style presets with descriptions

If the action is unclear, ask the user which one they want.

## Workflow

### Step 1 — Detect Prerequisites

Run a quick environment check:

```bash
ffmpeg -version | head -1
python3 -c "import whisper; print('whisper', whisper.__version__)"
```

If either fails, tell the user which prerequisite to install before continuing.

### Step 2 — Extract Audio (always, for transcribe/add)

```bash
python3 scripts/extract_audio.py "<VIDEO>" --output "<WORK_DIR>/<video_stem>.wav"
```

Use a writable workspace directory for intermediates (e.g. `/tmp/video-subtitle/` or the current project's `.workbuddy/scratch/`). Final output goes back to the user's working directory.

### Step 3 — Transcribe (Whisper)

```bash
python3 scripts/transcribe.py "<WORK_DIR>/<video_stem>.wav" \
    --model base \
    --output "<WORK_DIR>/<video_stem>.srt"
```

Print the detected language — use it to decide whether Step 4 (translate) is needed.

### Step 4 — Translate (only if user wants non-source language)

Read the SRT, translate each segment's text to the target language, preserve index/timestamps exactly. Write to `<WORK_DIR>/<video_stem>.<target_lang>.srt`.

### Step 5 — Burn

**Single subtitle:**
```bash
python3 scripts/burn_subtitle.py "<VIDEO>" "<SRT>" \
    --output "<USER_OUTPUT_DIR>/<video_stem>.subtitled.<ext>" \
    --style default
```

**Dual subtitle:**
```bash
python3 scripts/burn_dual_subtitle.py "<VIDEO>" "<ORIGINAL_SRT>" "<TRANSLATED_SRT>" \
    --output "<USER_OUTPUT_DIR>/<video_stem>.dual.<ext>"
```

## Style Presets

| Preset | Description |
|---|---|
| `default` | White 18pt, thin outline, semi-transparent background box — clean modern look |
| `streaming` | White 16pt, background box — Netflix-style |
| `white_shadow` | White 20pt, stronger shadow — good for dark videos |
| `yellow_black` | Yellow 20pt — traditional high contrast |
| `minimal` | White 16pt, very thin outline — least intrusive |

Custom: `--custom "FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000"`.

## Notes

- All script paths are relative to the skill's installation directory. In Claude Code, `${CLAUDE_SKILL_DIR}` resolves to it.
- For sandboxed directories (e.g. Desktop), always write intermediates to `/tmp/video-subtitle/` first, then copy the final output back.
- The `transcribe` step downloads the Whisper model on first run (~140MB for `base`).
- For Linux without `PingFang SC`, see `SKILL.md` Troubleshooting.

## 完成后的回复模板

After completing, report:
1. The output file path (absolute, so the user can open it)
2. Detected/translated language(s)
3. File size of the output video
4. Any warnings (font issues, model downloads, etc.)
