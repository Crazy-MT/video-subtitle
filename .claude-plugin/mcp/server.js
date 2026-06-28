#!/usr/bin/env node
/**
 * MCP server for video-subtitle skill.
 * Exposes the Python scripts as MCP tools over stdio (JSON-RPC 2.0).
 *
 * Tools:
 *   - extract_audio
 *   - transcribe
 *   - translate_srt   (thin wrapper — actual translation is still done by the LLM via Read/Write)
 *   - burn_subtitle
 *   - burn_dual_subtitle
 *   - list_style_presets
 *   - check_prerequisites
 */
const { spawn, execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const PY = process.env.PYTHON_BIN || (os.platform() === 'win32' ? 'python' : 'python3');
const FFMPEG = process.env.FFMPEG_BIN || 'ffmpeg';
const SCRIPT_DIR = path.resolve(__dirname, '..', '..', 'scripts');
const IS_WINDOWS = os.platform() === 'win32';

// Find an executable on either POSIX (via `command -v`) or Windows (via `where`).
// Falls back to a PATH scan if neither is available (Windows PowerShell only).
function which(bin) {
  if (IS_WINDOWS) {
    // Try `where` first (cmd.exe builtin), then PowerShell's Get-Command.
    try {
      const out = spawnSync('where', [bin], { encoding: 'utf8', shell: true }).stdout || '';
      const first = out.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
      if (first) return first;
    } catch {}
    try {
      const out = spawnSync('powershell.exe', ['-NoProfile', '-Command', `(Get-Command ${bin}).Source`],
        { encoding: 'utf8' }).stdout || '';
      const first = out.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
      if (first) return first;
    } catch {}
    return null;
  }
  try {
    return execSync(`command -v ${bin}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

function runPython(script, args) {
  return new Promise((resolve, reject) => {
    // On Windows, the Python script is invoked with the .py extension via
    // python.exe (or `py` launcher). We pass it as a single argv element so
    // Node handles all the quoting for us, avoiding Windows path issues.
    const proc = spawn(PY, [path.join(SCRIPT_DIR, script), ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      // Don't run through a shell on Windows — it mangles the argv.
      shell: false,
    });
    let out = '';
    let err = '';
    proc.stdout.on('data', (c) => (out += c.toString()));
    proc.stderr.on('data', (c) => (err += c.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout: out, stderr: err });
      else reject(new Error(`exit ${code}: ${err || out}`));
    });
  });
}

const TOOLS = [
  {
    name: 'check_prerequisites',
    description: 'Check ffmpeg/ffprobe/whisper availability. Returns a JSON object { ffmpeg: bool, ffprobe: bool, whisper: bool, whisper_version?: string }.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const result = { ffmpeg: false, ffprobe: false, whisper: false, platform: os.platform() };
      result.ffmpeg = !!which(FFMPEG);
      result.ffprobe = !!which('ffprobe');
      try {
        const v = spawnSync(PY, ['-c', 'import whisper; print(whisper.__version__)'], { encoding: 'utf8' });
        if (v.status === 0) {
          result.whisper = true;
          result.whisper_version = (v.stdout || '').trim();
        }
      } catch {}
      return result;
    },
  },
  {
    name: 'list_style_presets',
    description: 'List all available subtitle style presets with their ASS parameters. / 列出所有可用的字幕样式预设。',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const presets = {
        default:      { FontName: 'PingFang SC', FontSize: '18', desc: 'White 18pt, thin outline, semi-transparent background box' },
        streaming:    { FontName: 'PingFang SC', FontSize: '16', desc: 'White 16pt, background box — Netflix-style' },
        white_shadow: { FontName: 'PingFang SC', FontSize: '20', desc: 'White 20pt, stronger shadow — good for dark videos' },
        yellow_black: { FontName: 'PingFang SC', FontSize: '20', desc: 'Yellow 20pt — traditional high contrast' },
        minimal:      { FontName: 'PingFang SC', FontSize: '16', desc: 'White 16pt, very thin outline — least intrusive' },
      };
      return presets;
    },
  },
  {
    name: 'extract_audio',
    description: 'Extract 16kHz mono WAV from a video. / 从视频中提取 16kHz 单声道 WAV 音频。',
    inputSchema: {
      type: 'object',
      properties: {
        video_path: { type: 'string', description: 'Input video file path' },
        output_path: { type: 'string', description: 'Output WAV path (default: <video_stem>.wav)' },
      },
      required: ['video_path'],
    },
    handler: async ({ video_path, output_path }) => {
      const args = [video_path];
      if (output_path) args.push('--output', output_path);
      const r = await runPython('extract_audio.py', args);
      return { output_path: output_path || video_path.replace(/\.[^.]+$/, '.wav'), log: r.stdout };
    },
  },
  {
    name: 'transcribe',
    description: 'Transcribe audio to SRT using OpenAI Whisper. / 使用 OpenAI Whisper 将音频转写为 SRT 字幕。',
    inputSchema: {
      type: 'object',
      properties: {
        audio_path: { type: 'string' },
        model: { type: 'string', enum: ['tiny', 'base', 'small', 'medium', 'large'], default: 'base' },
        output_path: { type: 'string' },
        language: { type: 'string', description: 'Force language code (zh, en, ja...) or omit to auto-detect' },
      },
      required: ['audio_path'],
    },
    handler: async ({ audio_path, model = 'base', output_path, language }) => {
      const args = [audio_path, '--model', model];
      if (output_path) args.push('--output', output_path);
      if (language) args.push('--language', language);
      const r = await runPython('transcribe.py', args);
      // Parse detected language from stdout
      const m = r.stdout.match(/Detected language:\s*(\S+)/);
      return {
        srt_path: output_path || audio_path.replace(/\.[^.]+$/, '.srt'),
        detected_language: m ? m[1] : null,
        log: r.stdout,
      };
    },
  },
  {
    name: 'burn_subtitle',
    description: 'Hardcode an SRT subtitle into a video with a style preset. / 将 SRT 字幕硬编码烧录到视频中。',
    inputSchema: {
      type: 'object',
      properties: {
        video_path: { type: 'string' },
        srt_path: { type: 'string' },
        output_path: { type: 'string' },
        style: { type: 'string', enum: ['default', 'streaming', 'white_shadow', 'yellow_black', 'minimal'], default: 'default' },
        custom_style: { type: 'string', description: 'Custom ASS force_style string, overrides --style' },
      },
      required: ['video_path', 'srt_path'],
    },
    handler: async ({ video_path, srt_path, output_path, style = 'default', custom_style }) => {
      const args = [video_path, srt_path, '--style', style];
      if (output_path) args.push('--output', output_path);
      if (custom_style) args.push('--custom', custom_style);
      const r = await runPython('burn_subtitle.py', args);
      return { output_path: output_path || video_path.replace(/(\.[^.]+)$/, '.subtitled$1'), log: r.stdout };
    },
  },
  {
    name: 'burn_dual_subtitle',
    description: 'Burn original + translated SRTs as dual subtitles (original on top, translation below). / 烧录双语字幕（原文在上，译文在下）。',
    inputSchema: {
      type: 'object',
      properties: {
        video_path: { type: 'string' },
        original_srt: { type: 'string' },
        translated_srt: { type: 'string' },
        output_path: { type: 'string' },
      },
      required: ['video_path', 'original_srt', 'translated_srt'],
    },
    handler: async ({ video_path, original_srt, translated_srt, output_path }) => {
      const args = [video_path, original_srt, translated_srt];
      if (output_path) args.push('--output', output_path);
      const r = await runPython('burn_dual_subtitle.py', args);
      return { output_path: output_path || video_path.replace(/(\.[^.]+)$/, '.dual$1'), log: r.stdout };
    },
  },
];

const TOOL_LIST = TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));

// --- Minimal JSON-RPC over stdio ---
const rl = readline.createInterface({ input: process.stdin, terminal: false });
let buf = '';

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function handle(req) {
  if (req.method === 'initialize') {
    return send({
      jsonrpc: '2.0',
      id: req.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'video-subtitle-mcp', version: '1.0.0' },
      },
    });
  }
  if (req.method === 'notifications/initialized') return;
  if (req.method === 'tools/list') {
    return send({ jsonrpc: '2.0', id: req.id, result: { tools: TOOL_LIST } });
  }
  if (req.method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === req.params.name);
    if (!tool) {
      return send({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: 'Unknown tool' } });
    }
    tool.handler(req.params.arguments || {}).then(
      (result) => send({
        jsonrpc: '2.0',
        id: req.id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      }),
      (err) => send({
        jsonrpc: '2.0',
        id: req.id,
        error: { code: -32000, message: err.message || String(err) },
      }),
    );
    return;
  }
  if (req.method === 'ping') {
    return send({ jsonrpc: '2.0', id: req.id, result: {} });
  }
  send({ jsonrpc: '2.0', id: req.id, error: { code: -32601, message: `Unknown method: ${req.method}` } });
}

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    handle(JSON.parse(line));
  } catch (e) {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
  }
});
