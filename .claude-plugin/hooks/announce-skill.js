#!/usr/bin/env node
/**
 * SessionStart hook: announce that the video-subtitle skill is loaded.
 * Print a short banner with available commands and a quick health check.
 * Cross-platform: uses `where` on Windows, `command -v` elsewhere.
 */
const { execSync, spawnSync } = require('child_process');
const os = require('os');

const IS_WINDOWS = os.platform() === 'win32';

function has(cmd) {
  if (IS_WINDOWS) {
    const r = spawnSync('where', [cmd], { encoding: 'utf8', shell: true });
    return r.status === 0 && r.stdout.trim().length > 0;
  }
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const ffmpeg = has('ffmpeg');
const ffprobe = has('ffprobe');
let whisper = false;
try {
  const py = IS_WINDOWS ? 'python' : 'python3';
  const r = spawnSync(py, ['-c', 'import whisper'], { encoding: 'utf8' });
  whisper = r.status === 0;
} catch {}

const ok = '✓';
const no = '✗';

console.error(`
🎬 video-subtitle plugin loaded (${os.platform()})
  ffmpeg:    ${ffmpeg ? ok : no}    whisper: ${whisper ? ok : no}    ffprobe: ${ffprobe ? ok : no}
  Commands:  /video-subtitle <action> [video]
             /video-subtitle add  |  transcribe  |  translate  |  burn  |  burn-dual  |  style-presets
  Agent:     subtitle-translator (for SRT-only translation tasks)
`);
