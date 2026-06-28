#!/usr/bin/env node
/**
 * bin/announce.js — postinstall hook. Print a friendly message about next steps.
 * Runs after `npm install` succeeds.
 */
console.log(`
📦 video-subtitle-skill installed.

This package is the installer — the actual skill is shipped in the same
repository. To use it:

  1. Install the skill into your agent's skills directory:
       npx video-subtitle-install
     (or specify a target: --target claude, codex, cursor, kiro, opencode, all)

  2. Verify the environment:
       npx video-subtitle-verify

  3. Restart your AI agent and try:
       /video-subtitle style-presets

To uninstall:
  npx video-subtitle-install --uninstall
`);
