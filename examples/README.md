# Examples

Real-world inputs and outputs to use as references when invoking the skill.

## Files

### Input

- [`input/sample-chinese.srt`](input/sample-chinese.srt) — Sample Chinese SRT
  you can use to test the translate-then-burn flow without needing a real video.

### Output

- [`output/sample-english.srt`](output/sample-english.srt) — Same content
  translated to English (preserves timestamps).
- [`output/sample-dual.ass`](output/sample-dual.ass) — Auto-generated ASS file
  combining original + translated SRTs for dual-subtitle burning.

### Scripts

- [`full-pipeline.sh`](full-pipeline.sh) — One-shot shell script that runs
  extract → transcribe → (translate) → burn. Use as a starting point or
  reference for your own automation.

### Reference docs

- [`preset-comparison.md`](preset-comparison.md) — Side-by-side comparison of
  all style presets with use-case guidance.
- [`prompts.md`](prompts.md) — Copy-paste prompts for the translation step
  in multiple language pairs.

## How to use

### 1. Try the pipeline on a real video

```bash
./examples/full-pipeline.sh /path/to/your/video.mp4 en
```

This produces `output/<video_stem>.wav`, `.srt`, and (if translation is
provided) a `.dual.mp4`.

### 2. Test translation without a video

```
> Read examples/input/sample-chinese.srt and translate to English.
> Save to examples/output/sample-english.srt
```

Then use `sample-chinese.srt` and `sample-english.srt` as inputs to
`burn_dual_subtitle.py` against any video to see the dual-subtitle layout
without going through Whisper.

### 3. Customize the style preset

See [`preset-comparison.md`](preset-comparison.md) for the full list, then
use the `--custom` flag to override individual parameters:

```bash
python3 scripts/burn_subtitle.py video.mp4 sub.srt \
  --output out.mp4 \
  --custom "FontSize=24,PrimaryColour=&H0000FF00,OutlineColour=&H00FFFFFF,BackColour=&H66000000,BorderStyle=4"
```

(The example above gives you bright-green text on a 40%-opaque black box —
useful for accessibility demos.)
