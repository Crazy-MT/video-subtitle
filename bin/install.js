#!/usr/bin/env node
/**
 * bin/install.js — install the video-subtitle skill into the user's home dir.
 *
 * Targets (auto-detected, override with --target):
 *   claude   → ~/.claude/skills/video-subtitle/
 *   codex    → ~/.agents/skills/video-subtitle/
 *   cursor   → ~/.cursor/skills/video-subtitle/
 *   kiro     → ~/.kiro/skills/video-subtitle/
 *   opencode → ~/.config/opencode/skills/video-subtitle/
 *   all      → all of the above
 *
 * Flags:
 *   --target <name>    target agent (claude/codex/cursor/kiro/opencode/all)
 *   --project          install into ./<project_dir>/.claude/skills/ instead of $HOME
 *   --dry-run          show what would happen without copying
 *   --uninstall        remove the skill from the target
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const PKG_ROOT = path.resolve(__dirname, '..');
const SKILL_NAME = 'video-subtitle';
const SKILL_SRC = path.join(PKG_ROOT);

const TARGETS = {
  claude:   { factory: () => path.join(os.homedir(), '.claude', 'skills', SKILL_NAME) },
  codex:    { factory: () => path.join(os.homedir(), '.agents', 'skills', SKILL_NAME) },
  cursor:   { factory: () => path.join(os.homedir(), '.cursor', 'skills', SKILL_NAME) },
  kiro:     { factory: () => path.join(os.homedir(), '.kiro', 'skills', SKILL_NAME) },
  opencode: { factory: () => path.join(os.homedir(), '.config', 'opencode', 'skills', SKILL_NAME) },
  // Claude Code on Windows uses %USERPROFILE%\.claude\... (same path, just
  // expressed with OS-native separator). The Unix-style paths above resolve
  // to the right place because Node's path.join normalises them.
};

const args = process.argv.slice(2);
const get = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
};
const has = (flag) => args.includes(flag);

const target = get('--target', null);
const project = has('--project');
const dryRun = has('--dry-run');
const uninstall = has('--uninstall');

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    // Skip build artefacts, IDE configs, and project memory
    if (['node_modules', '.git', '.DS_Store'].includes(entry.name)) continue;
    if (entry.name.startsWith('.workbuddy')) continue;  // project-only memory
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function removeDir(dst) {
  if (!fs.existsSync(dst)) return false;
  fs.rmSync(dst, { recursive: true, force: true });
  return true;
}

function pickTargets() {
  if (project) {
    return {
      'project-claude': path.join(process.cwd(), '.claude', 'skills', SKILL_NAME),
      'project-codex':  path.join(process.cwd(), '.agents', 'skills', SKILL_NAME),
    };
  }
  if (!target || target === 'all') {
    const out = {};
    for (const [name, t] of Object.entries(TARGETS)) out[name] = t.factory();
    return out;
  }
  if (!TARGETS[target]) {
    console.error(`Unknown target: ${target}. Available: ${Object.keys(TARGETS).join(', ')}, all`);
    process.exit(1);
  }
  return { [target]: TARGETS[target].factory() };
}

function actionFor(label) {
  if (uninstall) return 'uninstall';
  if (dryRun) return 'dry-run';
  return 'install';
}

function run() {
  const targets = pickTargets();
  for (const [name, dst] of Object.entries(targets)) {
    const action = actionFor(name);
    const actionLabel = uninstall ? '🗑  Removing' : dryRun ? '👁  Would install' : '📦 Installing';
    console.log(`${actionLabel} → ${dst}`);
    if (dryRun || uninstall) {
      if (fs.existsSync(dst)) {
        if (uninstall) {
          try { removeDir(dst); console.log(`   ✓ removed`); } catch (e) { console.error(`   ✗ ${e.message}`); }
        } else {
          console.log(`   (already exists — would overwrite)`);
        }
      } else {
        console.log(`   (does not exist)`);
      }
      continue;
    }
    if (fs.existsSync(dst)) {
      console.log(`   ⚠ already exists, overwriting`);
      removeDir(dst);
    }
    try {
      copyDir(SKILL_SRC, dst);
      console.log(`   ✓ done — invoke with: ${name.startsWith('project-') ? 'project-level' : 'user-level'} skill in ${name}`);
    } catch (e) {
      console.error(`   ✗ ${e.message}`);
      process.exit(1);
    }
  }
  if (!uninstall && !dryRun) {
    console.log(`
✨ video-subtitle installed.

Next steps:
  1. Verify prerequisites:    npx video-subtitle-verify
  2. Restart your AI agent (Claude Code / Codex / Cursor / ...)
  3. Try:                     /video-subtitle style-presets

To remove:                   npx video-subtitle-skill uninstall
`);
  }
}

run();
