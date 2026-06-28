#!/usr/bin/env node
/**
 * PostToolUse hook: after any ffmpeg burn-subtitle run, verify the output
 * video actually contains a video stream. Catches the "silent failure"
 * case where ffmpeg reports success but libass didn't render anything.
 *
 * Exit 0 always — we just emit additional context, never block.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

let raw = '';
const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => { raw += line; });
rl.on('close', () => {
  try {
    const payload = JSON.parse(raw);
    const cmd = payload?.tool_input?.command || '';
    if (!/burn_subtitle|burn_dual_subtitle|ffmpeg.*subtitles=/i.test(cmd)) {
      return;
    }
    const out = cmd.match(/--output\s+["']?([^\s"']+)["']?/);
    if (!out || !fs.existsSync(out[1])) return;

    // Probe the output
    let probe;
    try {
      probe = execSync(`ffprobe -v error -show_streams -show_format -of json "${out[1]}"`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch (e) {
      console.error(`[video-subtitle] ffprobe failed on ${out[1]} — output may be corrupt.`);
      return;
    }
    const meta = JSON.parse(probe);
    const video = (meta.streams || []).find((s) => s.codec_type === 'video');
    if (!video) {
      console.error(`[video-subtitle] Output ${out[1]} has no video stream!`);
      return;
    }
    const sizeMb = (fs.statSync(out[1]).size / 1024 / 1024).toFixed(1);
    const dur = parseFloat(meta.format?.duration || '0').toFixed(1);
    console.error(
      `[video-subtitle] ✓ Burn OK — ${out[1]} (${sizeMb} MB, ${dur}s, ${video.codec_name})`
    );
  } catch (e) {
    // Silent — never break the tool call.
  }
});
