#!/usr/bin/env node
/**
 * bin/verify.js — check that the user's environment can run the skill.
 * Verifies ffmpeg, ffprobe, and openai-whisper. Reports what's missing.
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PY = process.env.PYTHON_BIN || (os.platform() === 'win32' ? 'python' : 'python3');
const IS_WINDOWS = os.platform() === 'win32';

function has(cmd) {
  if (IS_WINDOWS) {
    // `where` is a cmd.exe builtin; `command -v` doesn't exist in PowerShell.
    try {
      const r = spawnSync('where', [cmd], { encoding: 'utf8', shell: true });
      return r.status === 0 && r.stdout.trim().length > 0;
    } catch { return false; }
  }
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

function version(cmd, args) {
  try {
    return execSync(`${cmd} ${args.join(' ')}`, { encoding: 'utf8' }).split('\n')[0].trim();
  } catch (e) {
    return null;
  }
}

function installHint() {
  if (IS_WINDOWS) return 'install with: winget install ffmpeg  (or choco install ffmpeg)';
  if (os.platform() === 'darwin') return 'install with: brew install ffmpeg';
  if (os.platform() === 'linux') return 'install with: sudo apt install ffmpeg  (or your distro package manager)';
  return 'install ffmpeg and ensure it is on PATH';
}

const checks = [];

checks.push({
  name: 'ffmpeg',
  ok: has('ffmpeg'),
  detail: version('ffmpeg', ['-version']) || `NOT FOUND — ${installHint()}`,
});

checks.push({
  name: 'ffprobe',
  ok: has('ffprobe'),
  detail: version('ffprobe', ['-version']) || 'NOT FOUND — usually bundled with ffmpeg',
});

let whisperOk = false;
let whisperDetail = 'NOT FOUND — install with: pip install openai-whisper';
try {
  const v = spawnSync(PY, ['-c', 'import whisper; print(whisper.__version__)'], { encoding: 'utf8' });
  if (v.status === 0) {
    whisperOk = true;
    whisperDetail = `openai-whisper ${v.stdout.trim()}`;
  }
} catch {}
checks.push({ name: 'openai-whisper', ok: whisperOk, detail: whisperDetail });

// Check that scripts are present and executable
const scriptsDir = path.resolve(__dirname, '..', 'scripts');
let scriptsOk = false;
if (fs.existsSync(scriptsDir)) {
  const required = ['extract_audio.py', 'transcribe.py', 'translate_subtitle.py', 'burn_subtitle.py', 'burn_dual_subtitle.py'];
  scriptsOk = required.every((f) => fs.existsSync(path.join(scriptsDir, f)));
}
checks.push({
  name: 'scripts',
  ok: scriptsOk,
  detail: scriptsOk ? `${scriptsDir}` : `MISSING — expected at ${scriptsDir}`,
});

// Check SKILL.md frontmatter
const skillPath = path.resolve(__dirname, '..', 'SKILL.md');
let skillOk = false;
if (fs.existsSync(skillPath)) {
  const content = fs.readFileSync(skillPath, 'utf8');
  skillOk = /^---\nname:\s*[a-z0-9][a-z0-9-]*[a-z0-9]\s*\n/m.test(content);
}
checks.push({
  name: 'SKILL.md',
  ok: skillOk,
  detail: skillOk ? 'valid frontmatter' : `MISSING or invalid — expected at ${skillPath}`,
});

const allOk = checks.every((c) => c.ok);
console.log(`video-subtitle environment check (${os.platform()})\n`);
for (const c of checks) {
  const mark = c.ok ? '✓' : '✗';
  console.log(`  ${mark}  ${c.name.padEnd(20)} ${c.detail}`);
}
console.log();
if (allOk) {
  console.log('✅ All checks passed. You can use the skill.');
  process.exit(0);
}
// ffprobe missing is non-fatal (just disables some diagnostics);
// whisper missing is a soft warning (you only need it for the transcribe step).
const blocking = checks.filter((c) => !c.ok && ['ffmpeg', 'scripts', 'SKILL.md'].includes(c.name));
if (blocking.length === 0) {
  console.log('⚠️  Soft warnings above (skill is usable, but some features may be limited).');
  process.exit(0);
}
console.log(`❌ Blocking issues: ${blocking.map((b) => b.name).join(', ')}. Fix these to use the skill.`);
process.exit(1);
