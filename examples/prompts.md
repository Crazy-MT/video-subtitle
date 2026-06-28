# Translation Prompts

Copy-paste prompts for the AI-driven translation step. Each preserves SRT
structure exactly (index, timestamps unchanged) — only the `text` field is
replaced.

## English → Simplified Chinese

```
You are translating a video subtitle file from English to Simplified Chinese.

Read the file at <srt_path>. For each segment, translate the text into
natural, conversational Simplified Chinese (zh-CN). Preserve the SRT
structure exactly: every index number, every timestamp line, every blank
line must remain byte-for-byte identical. Only the text lines change.

Rules:
- Keep translations concise (subtitle is read in 2-3 seconds)
- Match the register of the source (casual speech stays casual, technical
  content stays technical)
- For idioms, adapt to a natural Chinese equivalent rather than literal translate
- Preserve on-screen speaker labels if present

Write the result to <srt_stem>.zh-CN.srt (UTF-8, LF line endings, no BOM).

Report: total segments translated, output path, any segments where you
adapted idioms.
```

## Simplified Chinese → English

```
You are translating a video subtitle file from Simplified Chinese to English.

Read the file at <srt_path>. Translate each segment's text into natural,
conversational English. Preserve the SRT structure exactly — index numbers
and timestamps are byte-for-byte identical. Only the text changes.

Rules:
- Use casual, spoken English — these are subtitles for video
- Concise: 2-3 second read time per cue
- Keep Chinese cultural references but make them understandable (e.g.
  "Spring Festival" rather than literal-translating "春节")
- For untranslatable puns or wordplay, use a brief parenthetical

Write to <srt_stem>.en.srt (UTF-8, LF, no BOM).
```

## Auto-detect target language (most flexible)

```
You are translating a video subtitle file.

1. Detect the source language of <srt_path>
2. Ask the user for the target language (or use their prompt to determine it)
3. Translate the text fields while keeping all SRT structure (index, timestamps,
   blank-line separators) byte-for-byte identical
4. Write to <srt_stem>.<target_lang_code>.srt

Use the subtitle-translator agent (subagent) for this task.
```

## Bulk translation (multiple languages at once)

```
Translate <srt_path> into the following target languages, one file per language:
  - English (en)
  - Simplified Chinese (zh-CN)
  - Japanese (ja)
  - Korean (ko)

For each language, write a separate file: <srt_stem>.<lang>.srt.
All non-text fields are byte-identical to the source. Preserve natural
conversational tone in each target language.

Report one line per file: `<lang>: N segments, <path>`.
```

## Quality check (post-translation)

```
Verify the translated SRT at <translated_path> is structurally valid:

1. Same number of segments as the source at <source_path>
2. Every timestamp line (`HH:MM:SS,mmm --> HH:MM:SS,mmm`) is byte-identical
   to the source
3. Index sequence is 1, 2, 3, ... continuous from 1
4. No empty text fields
5. UTF-8 encoded, LF line endings, no BOM

Report any mismatches with line numbers. Do NOT fix them — just report.
```
