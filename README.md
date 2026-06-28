# video-subtitle

Video subtitle pipeline skill for WorkBuddy. Supports the full workflow: audio extraction → speech-to-text transcription → subtitle translation → burning subtitles into video.

## Features

- **Audio Extraction** — Extract 16kHz mono WAV from any video using ffmpeg
- **Transcription** — Convert audio to timestamped SRT subtitles using OpenAI Whisper (supports `tiny` / `base` / `small` / `medium` / `large` models)
- **Translation** — Translate SRT subtitles to any target language using AI, preserving timestamps
- **Single Subtitle Burn** — Hardcode one SRT into video with style presets (`default`, `streaming`, `white_shadow`, `yellow_black`, `minimal`)
- **Dual Subtitle Burn** — Burn original + translated SRTs simultaneously (original on top, translation below) via ASS subtitles

## Scripts

| Script | Description |
|--------|-------------|
| `scripts/extract_audio.py` | Extract audio from video to WAV |
| `scripts/transcribe.py` | Transcribe audio to SRT using Whisper |
| `scripts/translate_subtitle.py` | Translate SRT subtitles to target language |
| `scripts/burn_subtitle.py` | Burn single SRT into video with style presets |
| `scripts/burn_dual_subtitle.py` | Burn dual SRTs (original + translation) into video |

## Prerequisites

- `ffmpeg` and `ffprobe` (check with `ffmpeg -version`)
- Python 3 with `openai-whisper` (`pip install openai-whisper`)

## Installation

Copy this directory into your WorkBuddy skills folder, or install via the WorkBuddy skill installer.

## Usage (via WorkBuddy)

Ask WorkBuddy naturally:

- "给这个视频加字幕"
- "帮我把 lecture.mp4 生成中英双语字幕"
- "提取视频中的字字幕并翻译成英文"
- "burn subtitles into my video"

WorkBuddy will run the appropriate pipeline steps automatically.

## Pipeline Example

```
Input: lecture.mp4 (Chinese speech)
  → extract_audio.py  → lecture.wav
  → transcribe.py     → lecture.srt (detected: Chinese)
  → translate (AI)    → lecture.english.srt
  → burn_dual_subtitle.py → lecture.dual.mp4 (Chinese + English)
```

## License

MIT
