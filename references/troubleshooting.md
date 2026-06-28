# Troubleshooting

Common issues and fixes for the video-subtitle skill. **Windows users — see the
[Windows section](#windows-specific-issues) at the bottom first.**

## ffmpeg not found

**Symptom**: `ffmpeg: command not found` or `ffprobe: command not found`.

**Fix**:
- **macOS**: `brew install ffmpeg`
- **Debian/Ubuntu**: `sudo apt install ffmpeg`
- **Arch**: `sudo pacman -S ffmpeg`
- **Windows (winget)**: `winget install -e --id Gyan.FFmpeg`
- **Windows (Chocolatey)**: `choco install ffmpeg`
- **Windows (manual)**: download from [ffmpeg.org](https://ffmpeg.org/download.html#build-windows), unzip, add `bin\` to your `PATH`
- **Verify**: `ffmpeg -version` and `ffprobe -version`

## openai-whisper not found

**Symptom**: `ModuleNotFoundError: No module named 'whisper'`.

**Fix**: `pip install openai-whisper` (whisper depends on ffmpeg too).

For a lighter install (less disk, no PyTorch CUDA), use `pip install openai-whisper`.

> First run downloads a Whisper model. `base` is ~140MB; `large` is ~2.9GB.

## Subtitles don't appear in the output

**Symptom**: ffmpeg runs, output file is created, but the video has no subtitles visible.

**Causes and fixes**:

1. **SRT path has special characters or is relative**
   ffmpeg's `subtitles=` filter is sensitive to path quoting. Always pass an
   absolute path. The script now does this automatically — it converts
   backslashes to forward slashes for cross-platform compatibility. In bash:
   ```bash
   python3 scripts/burn_subtitle.py "$PWD/lecture.mp4" "$PWD/lecture.srt" \
     --output "$PWD/out.mp4" --style default
   ```

2. **Font not found**
   ffmpeg's libass can't find the font specified in the style. The script
   auto-picks the right font for your platform:
   - macOS: PingFang SC
   - Windows: Microsoft YaHei
   - Linux: Noto Sans CJK SC

   Override with `--custom "FontName=...,..."` if your system has a different
   font.

3. **BorderStyle 4 with white text on white background**
   Subtitle box is rendered but invisible because it matches the background.
   Pick a different style.

4. **Output codec is the wrong one**
   ffmpeg's default mpeg4 codec sometimes doesn't show subtitles in some
   players. The script forces `libx264` (H.264) which works everywhere.

## Subtitle text is wrong

**Symptom**: The transcribed text has errors, especially with names, technical
terms, or accented speech.

**Fixes**:
- Use a larger Whisper model: `--model small` or `--model medium`
- For specific domains, fine-tune or use `--language zh` to force a specific
  language (sometimes more accurate than auto-detect)
- For names or jargon, the translation step in your AI agent can fix errors
  after transcription

## Chinese characters render as boxes

**Symptom**: Subtitles appear as squares / tofu □□□.

**Fix**:
- **macOS**: PingFang SC is built in. No fix needed.
- **Windows**: `Microsoft YaHei` is built in on Windows 7+. The script
  auto-selects it. If you don't have it, install any CJK font (e.g.
  download "Noto Sans CJK SC" from Google Fonts).
- **Linux**: `sudo apt install fonts-noto-cjk` and the script auto-selects
  `Noto Sans CJK SC`.

## Whisper model download fails

**Symptom**: First run hangs or errors during model download.

**Fixes**:
- Check internet connection
- Set `HF_ENDPOINT=https://hf-mirror.com` to use a Chinese mirror if you're
  in mainland China
- Manually download: `pip install -U huggingface_hub; python3 -c "from huggingface_hub import snapshot_download; snapshot_download('openai/whisper-base', local_dir='$HOME/.cache/whisper')"`

## Burned video is much larger than the source

**Symptom**: 100MB input → 1.5GB output.

**Cause**: The script uses `libx264 -crf 20 -preset medium` which produces
visually lossless output. For a smaller file, lower the CRF or use a faster
preset.

**Fix**:
```bash
# Edit the burn_subtitle.py call to use:
# --crf 23 --preset fast
# CRF 23 is the typical "good enough" YouTube default.
# preset ultrafast gives the smallest size at the cost of encoding time.
```

## Translation garbles timestamps

**Symptom**: Translated SRT has out-of-sync subtitles.

**Fix**: Re-translate with explicit instruction to keep timestamps
byte-identical. The [`examples/prompts.md`](../examples/prompts.md) file
has copy-paste prompts that include this constraint. Or use the
`subtitle-translator` subagent which enforces it.

## `pip install openai-whisper` is too slow

**Symptom**: Whisper pulls in PyTorch (~1GB), which takes minutes.

**Fix**: If you only need to burn pre-existing subtitles (no transcription),
you can skip Whisper entirely. The skill warns but still allows the install.

## Sandbox / permissions errors

**Symptom**: "Permission denied" when writing to Desktop or Downloads.

**Fix**:
- **macOS / Linux**: Write intermediates to `/tmp/video-subtitle/` (or
  `.workbuddy/scratch/`) and copy the final output back. The
  `examples/full-pipeline.sh` script handles this for you.
- **Windows**: Use `%TEMP%\video-subtitle\` instead. Or run your shell as
  Administrator if the destination truly requires elevation.

---

## Windows-specific issues

### `python` vs `python3` on Windows

Most Windows Python installs register `python.exe` (not `python3.exe`). The
MCP server, the verify script, and the announce hook all auto-detect the
right one based on `os.platform()`. If you have a custom install, set the
`PYTHON_BIN` environment variable:

```powershell
$env:PYTHON_BIN = "C:\Python311\python.exe"
```

### `pip` is not recognized

If `pip` isn't on PATH, use:

```powershell
python -m pip install openai-whisper
```

### ffmpeg `subtitles=` filter fails on Windows paths

`burn_subtitle.py` and `burn_dual_subtitle.py` automatically:
- Convert backslashes to forward slashes
- Pass absolute paths to ffmpeg
- Use `shell=False` style argv arrays (no shell-mangled quoting)

If you still hit issues, the most common cause is a path with a colon (`C:`)
being interpreted as a filter separator. Workaround: pass the SRT path as a
forward-slash absolute path explicitly, or use the dual-subtitle script
which writes a temp ASS file (no colon issue).

### CJK font not rendering

The script auto-picks:
- `Microsoft YaHei` on Windows
- `SimHei` as a fallback (override with `--custom "FontName=SimHei,..."`)

If you have a custom CJK font, override:

```powershell
python scripts\burn_subtitle.py in.mp4 sub.srt --output out.mp4 --custom "FontName=Noto Sans CJK SC,FontSize=20,..."
```

### Long path support (260-char limit)

If you hit "path too long" errors, enable long path support in Windows 10+:

1. Run `gpedit.msc` as Administrator
2. Navigate to: Computer Configuration → Administrative Templates → System → Filesystem
3. Enable "Enable Win32 long paths"

Or in PowerShell as Administrator:

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### PowerShell execution policy

If running `.ps1` files fails with "running scripts is disabled on this
system", use one of:

```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or invoke a single script with bypass
powershell -ExecutionPolicy Bypass -File .\script.ps1
```

### `where` vs `command -v`

The skill's hooks use `where` on Windows (cmd.exe builtin) and
`command -v` on macOS/Linux. If `where` doesn't find a binary that's
definitely installed, check that the directory containing it is in
your user PATH (not just system PATH).

---

## See also

- [`style-presets.md`](style-presets.md) — full ASS style reference
- [`../README.md`](../README.md) — installation per agent
- [`../examples/prompts.md`](../examples/prompts.md) — translation prompts
