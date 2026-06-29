# video-subtitle

Video subtitle pipeline — **add, generate, translate, and burn subtitles into videos** with ffmpeg + OpenAI Whisper. One `SKILL.md` works in Claude Code, OpenAI Codex CLI, ChatGPT, Cursor, Gemini CLI, Kiro, opencode, and 30+ other AI coding agents, with first-class support for Claude Code plugins (`.claude-plugin/`) and npm one-line install.

> 给视频加字幕、生成字幕、翻译字幕、烧录字幕；支持单语和双语字幕模式。

## Features

- **Audio Extraction** — Extract 16kHz mono WAV from any video with ffmpeg
- **Transcription** — Convert audio to timestamped SRT with OpenAI Whisper (`tiny` / `base` / `small` / `medium` / `large`)
- **AI Translation** — Translate SRT to any language while preserving timestamps
- **Single Subtitle Burn** — Hardcode one SRT into video with 5 built-in style presets + custom ASS
- **Dual Subtitle Burn** — Burn original + translated SRTs simultaneously via ASS

## Directory Layout

```
video-subtitle/
├── SKILL.md                         # Open-standard agent skill manifest
├── README.md                        # This file
├── LICENSE                          # MIT
├── package.json                     # npm one-line install
├── bin/                             # install.js, verify.js, uninstall.js
├── scripts/                         # 5 Python scripts (the actual work)
│   ├── extract_audio.py
│   ├── transcribe.py
│   ├── translate_subtitle.py
│   ├── burn_subtitle.py
│   └── burn_dual_subtitle.py
├── examples/                        # Sample SRTs, ASS, pipeline script, prompts
│   ├── input/sample-chinese.srt
│   ├── output/sample-english.srt
│   ├── output/sample-dual.ass
│   ├── full-pipeline.sh
│   ├── preset-comparison.md
│   └── prompts.md
├── references/                      # Detailed docs loaded on-demand
│   ├── style-presets.md
│   └── troubleshooting.md
├── agents/
│   └── openai.yaml                  # Codex-specific UI metadata
└── .claude-plugin/                  # Claude Code plugin bundle
    ├── plugin.json
    ├── commands/video-subtitle.md
    ├── agents/subtitle-translator.md
    ├── hooks/                       # Pre/Post-tool safety hooks
    │   ├── hooks.json
    │   ├── validate-burn-command.js
    │   ├── check-ffmpeg-output.js
    │   └── announce-skill.js
    └── mcp/                         # MCP server (structured tool calls)
        ├── servers.json
        └── server.js
```

## Prerequisites

- `ffmpeg` and `ffprobe` — `ffmpeg -version` to verify
- Python 3.8+ with `openai-whisper` — `pip install openai-whisper`

Quick check:
```bash
npx video-subtitle-verify
```

## Quick Start

### Option A — npm (one line, any agent)

```bash
npx video-subtitle-skill install --target all
# or: --target claude | codex | cursor | kiro | opencode
```

Verify:
```bash
npx video-subtitle-verify
```

Restart your agent, then try: `/video-subtitle style-presets` (Claude Code)
or `$video-subtitle` (Codex).

### Option B — Copy the directory manually

Drop the `video-subtitle/` folder into the right skills location for your
agent (see [Installation per Agent](#installation-per-agent) below).

### Option C — Install Claude Code plugin

```bash
# Inside Claude Code
/plugin install /path/to/video-subtitle
```

The plugin adds:
- `/video-subtitle` slash command
- `subtitle-translator` subagent (for SRT translation)
- MCP server (`extract_audio`, `transcribe`, `burn_subtitle`, ...)
- Pre-tool hooks that block self-overwrite and system-path writes

### Option D — Download release (minimal, any AI agent)

Download the latest `video-subtitle.zip` from [Releases](https://github.com/Crazy-MT/video-subtitle/releases), unzip it, then tell your AI agent:

> Install this skill: read SKILL.md and make scripts/ available. When the user asks for video subtitles, follow the workflow in SKILL.md.

The release contains only `SKILL.md` + `scripts/` — no npm, no plugin hooks, no extras. Works with any agent that can read a Markdown skill file and run shell commands.

## Pipeline

```
Input: lecture.mp4 (Chinese speech)
  → scripts/extract_audio.py      → lecture.wav
  → scripts/transcribe.py         → lecture.srt (detected: Chinese)
  → AI translates SRT             → lecture.english.srt
  → scripts/burn_dual_subtitle.py → lecture.dual.mp4 (Chinese + English)
```

Try it end-to-end:
```bash
./examples/full-pipeline.sh /path/to/video.mp4 en
```

## Installation per Agent

### Claude Code — Plugin (recommended)

```bash
# Inside Claude Code
/plugin install /path/to/video-subtitle
```

This installs commands, agents, hooks, and the MCP server. Use as
`/video-subtitle <action>`.

### Claude Code — Plain skill (no plugin)

```bash
# User-level
mkdir -p ~/.claude/skills
cp -R video-subtitle ~/.claude/skills/video-subtitle

# Project-level (commit to repo)
mkdir -p .claude/skills
cp -R video-subtitle .claude/skills/video-subtitle
```

### OpenAI Codex CLI

```bash
mkdir -p .agents/skills        # or ~/.agents/skills
cp -R video-subtitle .agents/skills/video-subtitle
```

`agents/openai.yaml` provides UI metadata for Codex's TUI.

### ChatGPT

Submit to [github.com/openai/skills](https://github.com/openai/skills) via a
PR to the `curated/` tier. After merge it appears in ChatGPT's skill picker.

### Cursor

```bash
mkdir -p .cursor/skills        # or ~/.cursor/skills
cp -R video-subtitle .cursor/skills/video-subtitle
```

### Kiro

```bash
mkdir -p .kiro/skills           # or ~/.kiro/skills
cp -R video-subtitle .kiro/skills/video-subtitle
```

### opencode

```bash
mkdir -p ~/.config/opencode/skills
cp -R video-subtitle ~/.config/opencode/skills/video-subtitle
```

### Gemini CLI

Gemini CLI uses TOML, not Markdown `SKILL.md`. Wrap it:

`~/.gemini/commands/video-subtitle.toml`
```toml
description = "Add, generate, translate, or burn subtitles into a video."

prompt = """
You have access to a video-subtitle skill. Read its SKILL.md and follow the
instructions for the user's request.

@{path/to/video-subtitle/SKILL.md}

User request: {{args}}
"""
```

### Aider / Continue / Cline / RooCode / Zed / Warp / Augment / Kilo Code / Devin / Jules

All follow the [AGENTS.md](https://agents.md/) open standard. Drop the
skill into the directory each agent expects (typically
`~/.config/<agent>/skills/` or `.agents/skills/`). See each agent's docs
for the exact path.

## Distribution Channels

| Channel | What it does | How to submit |
|---|---|---|
| **GitHub repo** | Source of truth, version controlled | Push to your own public repo |
| **Claude Code plugin** | Bundled commands, agents, hooks, MCP | This repo is already structured for it |
| **npm package** | One-line install for any user | `npm publish` after replacing the repo URL in `package.json` |
| **[agentskills.io](https://agentskills.io)** | Official standards registry | Linux Foundation AAIF spec |
| **[skills.sh](https://skills.sh)** | Vercel-hosted directory | Push to public GitHub; auto-indexed |
| **[SkillsMP](https://skillsmp.com)** | Independent search engine (1.8M+ skills) | Auto-discovered from GitHub |
| **OpenAI skills catalog** | Curated catalogue for Codex / ChatGPT | PR to [github.com/openai/skills](https://github.com/openai/skills) under `curated/` |
| **PyPI** | Alternative install for Python users | Wrap in a `setup.py` that copies to skills dir |

### Recommended release flow

1. **GitHub first.** Push to a public repo with this exact structure.
2. **Validate.** Run `npx skills-ref validate .` to check frontmatter.
3. **npm publish.** Replace repo URLs in `package.json`, then
   `npm publish --access public`.
4. **Submit to OpenAI** if you want it to appear in ChatGPT and Codex's
   default available skills.
5. **Announce** on skills.sh and SkillsMP (auto-indexed from GitHub).

## Style Presets

Five built-in presets, plus a `--custom` flag for any ASS key/value:

| Preset | Best for | Vibe |
|---|---|---|
| `default` | General purpose | Clean modern, YouTube-style |
| `streaming` | Long-form talk shows, lectures | Netflix-like, compact |
| `white_shadow` | Cinematic dark footage | Movie-subtitle look |
| `yellow_black` | Accessibility, small screens | Traditional closed-caption |
| `minimal` | Soft footage, product demos | Whisper-thin, least intrusive |

See [`references/style-presets.md`](references/style-presets.md) for the full
ASS reference and color-picker guide.

## What `.claude-plugin/` Adds

When installed as a Claude Code plugin, the skill becomes much more than a
prompt — it ships with:

| Component | Purpose |
|---|---|
| `plugin.json` | Plugin manifest with commands, agents, hooks, MCP wiring |
| `commands/video-subtitle.md` | `/video-subtitle <action>` slash command with full argument parsing |
| `agents/subtitle-translator.md` | Specialized subagent that translates SRT files while preserving timestamps |
| `hooks/validate-burn-command.js` | Pre-tool hook that blocks `burn_subtitle.py` calls that would overwrite the source video or write to system paths |
| `hooks/check-ffmpeg-output.js` | Post-tool hook that runs `ffprobe` on the output to confirm the burn actually worked |
| `hooks/announce-skill.js` | Session-start hook that prints a banner with environment status |
| `mcp/server.js` | MCP server exposing 6 tools (`extract_audio`, `transcribe`, `burn_subtitle`, `burn_dual_subtitle`, `list_style_presets`, `check_prerequisites`) with structured input/output |

## Examples

See the [`examples/`](examples/) directory for:
- Sample Chinese SRT + English translation
- Auto-generated dual-subtitle ASS
- A runnable `full-pipeline.sh` shell script
- `prompts.md` with copy-paste translation prompts
- `preset-comparison.md` with style guide

## License

MIT — see [`LICENSE`](LICENSE).
