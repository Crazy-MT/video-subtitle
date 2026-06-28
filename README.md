# video-subtitle

Video subtitle pipeline skill — add, generate, translate, and burn subtitles into videos. Implements the [Agent Skills Open Standard](https://agentskills.io), so a single `SKILL.md` works in **Claude Code, OpenAI Codex CLI, ChatGPT, Cursor, Gemini CLI, Kiro, opencode, Continue, Aider, Cline, and 30+ other AI coding agents** without modification.

## Features

- **Audio Extraction** — Extract 16kHz mono WAV from any video with ffmpeg
- **Transcription** — Convert audio to timestamped SRT with OpenAI Whisper (`tiny` / `base` / `small` / `medium` / `large`)
- **Translation** — Translate SRT to any target language via AI, preserving timestamps
- **Single Subtitle Burn** — Hardcode one SRT into video with style presets (`default`, `streaming`, `white_shadow`, `yellow_black`, `minimal`)
- **Dual Subtitle Burn** — Burn original + translated SRTs simultaneously (original on top, translation below) via ASS subtitles

## Directory Layout

```
video-subtitle/
├── SKILL.md                  # Required by Agent Skills Open Standard
├── README.md                 # This file (human-friendly)
├── LICENSE                   # MIT
├── agents/
│   └── openai.yaml           # Codex-specific UI & policy metadata
└── scripts/
    ├── extract_audio.py
    ├── transcribe.py
    ├── translate_subtitle.py
    ├── burn_subtitle.py
    └── burn_dual_subtitle.py
```

## Prerequisites

- `ffmpeg` and `ffprobe` (`ffmpeg -version` to verify)
- Python 3.8+
- `openai-whisper` (`pip install openai-whisper`)

## Quick Start (any agent)

Ask your agent naturally:

- "给这个视频加字幕"
- "帮我把 lecture.mp4 生成中英双语字幕"
- "burn subtitles into my video"
- "transcribe this video and translate to English"

The agent will automatically:

1. Extract audio → `*.wav`
2. Transcribe with Whisper → `*.srt`
3. (Optional) Translate → `*.<lang>.srt`
4. Burn into video → `*.subtitled.mp4` or `*.dual.mp4`

## Installation per Agent

### Claude Code

```bash
# Project-level (commit to repo for team use)
mkdir -p .claude/skills
cp -R video-subtitle .claude/skills/video-subtitle

# Or user-level (available in every project)
mkdir -p ~/.claude/skills
cp -R video-subtitle ~/.claude/skills/video-subtitle
```

Activate as slash command: type `/video-subtitle` in Claude Code.

### OpenAI Codex CLI

```bash
# Project-level (recommended for teams)
mkdir -p .agents/skills
cp -R video-subtitle .agents/skills/video-subtitle

# Or user-level
mkdir -p ~/.agents/skills
cp -R video-subtitle ~/.agents/skills/video-subtitle
```

Invoke as `$video-subtitle` in the TUI, or pass it to `codex exec`. Set
`policy.allow_implicit_invocation: false` in `agents/openai.yaml` if you want
it to be explicit-only.

### ChatGPT

Submit to OpenAI's skills catalog at <https://github.com/openai/skills> via a PR
to the `curated/` tier. See [Distribution Channels](#distribution-channels) below.

### Cursor

```bash
mkdir -p .cursor/skills
cp -R video-subtitle .cursor/skills/video-subtitle
```

### Gemini CLI

Gemini CLI does not natively read `SKILL.md`, but you can wire it up via a
TOML command. See [Gemini CLI compatibility note](#gemini-cli-compatibility-note).

### Other agents (Aider / Continue / Cline / Kiro / opencode / Warp / RooCode / Zed / Augment)

All of these follow the [AGENTS.md](https://agents.md/) open standard. Drop the
skill into the directory they expect (typically `~/.config/<agent>/skills/` or
`.agents/skills/`), and they will pick it up automatically. See each agent's
docs for the exact path.

## Distribution Channels

The same `SKILL.md` works across all of these — no rewriting required.

| Channel | What it does | How to submit |
|---|---|---|
| **GitHub repo** | Source of truth, version controlled | Push to your own repo (e.g. `yourname/video-subtitle`) |
| **[agentskills.io](https://agentskills.io)** | Official standards registry | Spec PR via Linux Foundation AAIF |
| **[skills.sh](https://skills.sh)** | Vercel-hosted directory, install via `npx skills add` | Push to a public GitHub repo; skills.sh indexes it automatically |
| **[SkillsMP](https://skillsmp.com)** | Independent search engine (1.8M+ skills) | Auto-discovered from GitHub |
| **OpenAI skills catalog** | Curated catalogue for Codex / ChatGPT | PR to [github.com/openai/skills](https://github.com/openai/skills) under `curated/` |
| **Claude Code Plugin** | Bundled with hooks, agents, MCP | Add `.claude-plugin/plugin.json` and submit to Anthropic's plugin marketplace |
| **npm package** | Easy install via `npm i -g @you/video-subtitle-skill` | Wrap the directory in a small npm package that copies it to `~/.claude/skills/` |
| **PyPI** | Easy install via `pip install video-subtitle-skill` | Same idea, hook into `pip install`'s post-install |

### Recommended flow

1. **GitHub first.** Push to a public repo with this exact structure. ~30+ tools
   can consume it directly without any extra packaging.
2. **Validate.** Run `npx skills-ref validate .` to ensure frontmatter is spec-compliant.
3. **Submit to OpenAI's catalog** if you want it to appear in ChatGPT and Codex's
   default available skills.
4. **Optional: wrap as plugin or npm package** for users who prefer one-line installs.

## Pipeline Example

```
Input: lecture.mp4 (Chinese speech)
  → scripts/extract_audio.py      → lecture.wav
  → scripts/transcribe.py         → lecture.srt (detected: Chinese)
  → AI translates SRT             → lecture.english.srt
  → scripts/burn_dual_subtitle.py → lecture.dual.mp4 (Chinese + English)
```

## Gemini CLI compatibility note

Gemini CLI uses TOML for custom commands, not Markdown `SKILL.md`. To make
this skill work in Gemini CLI, create a thin wrapper:

`~/.gemini/commands/video-subtitle.toml`

```toml
description = "Add, generate, translate, or burn subtitles into a video."

prompt = """
You have access to a video-subtitle skill at the path below. Read it and follow
its instructions for the user's request.

@{path/to/video-subtitle/SKILL.md}

User request: {{args}}
"""
```

## License

MIT — see [LICENSE](LICENSE).
