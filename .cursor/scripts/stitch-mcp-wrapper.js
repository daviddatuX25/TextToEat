#!/usr/bin/env node
/**
 * Wrapper for Stitch MCP proxy so the API key is loaded from a file.
 * Cursor on some platforms doesn't pass env from mcp.json; this ensures
 * STITCH_API_KEY is set before the proxy starts.
 * Key path is resolved relative to this script so it works regardless of cwd.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const scriptDir = __dirname;
const keyPath = path.join(scriptDir, '..', 'stitch-api-key');
let key;
try {
  key = fs.readFileSync(keyPath, 'utf8').trim();
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error('[stitch-mcp] Missing .cursor/stitch-api-key at', keyPath, '- copy .cursor/stitch-api-key.example to stitch-api-key and paste your Stitch API key (one line).');
  } else {
    console.error('[stitch-mcp] Failed to read .cursor/stitch-api-key:', e.message);
  }
  process.exit(1);
}

if (!key) {
  console.error('[stitch-mcp] .cursor/stitch-api-key is empty. Add your Stitch API key (one line).');
  process.exit(1);
}

process.env.STITCH_API_KEY = key;

// Prefer local install so we never run npx at MCP startup (avoids npm install hang)
const cursorDir = path.join(scriptDir, '..');
const localBin = path.join(cursorDir, 'node_modules', '.bin', 'stitch-mcp');
const localCli = path.join(cursorDir, 'node_modules', '@_davideast', 'stitch-mcp', 'bin', 'stitch-mcp.js');

let cmd;
let args;
if (fs.existsSync(localCli)) {
  cmd = process.execPath;
  args = [localCli, 'proxy'];
} else if (fs.existsSync(localBin)) {
  cmd = localBin;
  args = ['proxy'];
} else {
  cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  args = ['@_davideast/stitch-mcp', 'proxy'];
}

const child = spawn(cmd, args, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
  cwd: path.join(cursorDir, '..')
});

child.on('exit', (code, signal) => {
  process.exit(code != null ? code : signal ? 1 : 0);
});
