#!/usr/bin/env node
/**
 * bin/uninstall.js — remove the skill from all known locations.
 * Mirrors bin/install.js with --uninstall semantics.
 */
const { spawnSync } = require('child_process');

const r = spawnSync(process.execPath, [
  __filename.replace('uninstall.js', 'install.js'),
  '--uninstall',
  '--target', 'all',
], { stdio: 'inherit' });

process.exit(r.status || 0);
