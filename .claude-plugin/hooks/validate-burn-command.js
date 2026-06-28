#!/usr/bin/env node
/**
 * PreToolUse hook: validate burn-subtitle ffmpeg commands before they run.
 * Blocks calls that would overwrite the source video or write to system dirs.
 *
 * Receives the tool input as JSON on stdin (Claude Code hook protocol).
 * Exit 0 = allow, exit 2 = block (with reason on stderr).
 *
 * Set VIDEO_SUBTITLE_HOOK_DEBUG=1 to see trace logging on stderr.
 */
const readline = require('readline');

const DEBUG = process.env.VIDEO_SUBTITLE_HOOK_DEBUG === '1';
const log = (...a) => DEBUG && process.stderr.write('[hook] ' + a.join(' ') + '\n');

let raw = '';
const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => { raw += line; });
rl.on('close', () => {
  log('close fired, raw len=' + raw.length);
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch (e) {
    log('json parse error:', e.message);
    process.exit(0);
  }
  const cmd = payload?.tool_input?.command || '';
  log('cmd=' + JSON.stringify(cmd));

  // Only inspect burn-style commands
  if (!/burn_subtitle|burn_dual_subtitle|ffmpeg.*subtitles=/i.test(cmd)) {
    log('not a burn command, allow');
    process.exit(0);
  }

  // Block if --output points at the source video itself (would overwrite)
  const outMatch = cmd.match(/--output\s+["']?([^\s"']+)["']?/);
  // Detect raw ffmpeg invocations where the output is just a trailing
  // positional arg (e.g. `ffmpeg -i in.mp4 ... in.mp4`).
  const isFfmpeg = /\bffmpeg\b/.test(cmd);
  let effectiveOut = outMatch ? outMatch[1] : null;
  if (!effectiveOut && isFfmpeg) {
    // Find the last positional argument (the one that's not a flag value)
    const toks = cmd.split(/\s+/).filter(Boolean);
    for (let i = toks.length - 1; i > 0; i--) {
      if (!toks[i].startsWith('-') && !toks[i].endsWith('.srt') && !toks[i].endsWith('.ass')) {
        effectiveOut = toks[i];
        break;
      }
    }
  }
  if (effectiveOut) {
    log('effective output=' + effectiveOut);
    // Block macOS/Linux system paths AND Windows system paths.
    // We match by `Path/...` style substrings (works for both
    // `/usr/foo` and `C:\Windows\foo` once we normalise slashes).
    const norm = String(effectiveOut).replace(/\\/g, '/');
    const isSystemPath = [
      '/System/',          // macOS
      '/usr/',             // Linux/macOS
      '/bin/',             // Linux/macOS
      'C:/Windows/',       // Windows
      'C:/Program Files/', // Windows
    ].some((p) => norm.toLowerCase().includes(p.toLowerCase()));
    if (isSystemPath) {
      process.stderr.write(`[video-subtitle] Refusing to write subtitle output to system path: ${effectiveOut}\n`);
      process.exit(2);
    }
  }
  // Also scan for Windows system path fragments. Catches unquoted paths
  // like `C:\Program Files\out.mp4` which the output detector above would
  // have split into multiple tokens on the space. We rebuild the joined
  // command (with single spaces) and check for the system substrings.
  if (isFfmpeg) {
    const joined = cmd.replace(/\s+/g, ' ');
    const norm = joined.replace(/\\/g, '/');
    const winSysFragment = [
      /\/Windows\//i,
      /\/Program Files\//i,
    ].some((re) => re.test(norm));
    if (winSysFragment && /[a-zA-Z]:[\\/]/i.test(norm)) {
      // Only block if it actually looks like a Windows path (drive letter)
      process.stderr.write(
        `[video-subtitle] Refusing to write subtitle output to a Windows system path.\n`,
      );
      process.exit(2);
    }
  }

  // Block if output equals input. The input can be either:
  //   ffmpeg -i in.mp4 ...  (ffmpeg style)
  //   python3 burn_subtitle.py in.mp4 ...  (positional arg)
  if (effectiveOut) {
    const ffmpegInput = cmd.match(/-i\s+["']?([^\s"']+)["']?/);
    if (ffmpegInput && ffmpegInput[1] === effectiveOut) {
      process.stderr.write(
        `[video-subtitle] BLOCKED: --output equals -i input (${effectiveOut}). ` +
        'This would overwrite your source video.\n'
      );
      process.exit(2);
    }
    // For burn_subtitle.py / burn_dual_subtitle.py the first positional
    // arg is the video. The command-line shape is:
    //   <script> <video> [srt] --output <out> [more-flags]
    if (/burn_subtitle\.py|burn_dual_subtitle\.py/.test(cmd)) {
      const stripped = cmd
        .replace(/--output\s+["']?[^\s"']+["']?/, '')
        .replace(/-[a-zA-Z]\s+["']?[^\s"']+["']?/g, '');   // strip --style default etc.
      const toks = stripped.split(/\s+/).filter(Boolean);
      let videoArg = null;
      for (let i = 0; i < toks.length; i++) {
        if (toks[i].endsWith('.py')) {
          videoArg = toks[i + 1] || null;
          break;
        }
      }
      log('positional video arg = ' + videoArg);
      if (videoArg && videoArg === effectiveOut) {
        process.stderr.write(
          `[video-subtitle] BLOCKED: --output equals video input (${effectiveOut}). ` +
          'This would overwrite your source video.\n'
        );
        process.exit(2);
      }
    }
  }

  log('allow');
  process.exit(0);
});
