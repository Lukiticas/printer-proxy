const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2];

if (!['electron', 'node'].includes(target)) {
  console.error('Usage: ensure-native.js electron|node');
  process.exit(1);
}

const moduleRoot = path.join(__dirname, '..', 'node_modules', '@grandchef', 'node-printer');
const sentinelElectron = path.join(moduleRoot, '.built-for-electron');
const sentinelNode = path.join(moduleRoot, '.built-for-node');
const binary = path.join(moduleRoot, 'lib', 'node_printer.node');

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

if (!exists(moduleRoot)) {
  console.log('[ensure-native] Module directory not found (maybe not installed yet) – skipping.');
  process.exit(0);
}

let current = null;

if (exists(sentinelElectron)) {
  current = 'electron';
} else if (exists(sentinelNode)) {
  current = 'node';
}

const needs = current !== target;

if (!exists(binary)) {
  console.log('[ensure-native] Native binary missing; forcing rebuild for', target);
}

if (needs || !exists(binary)) {
  console.log(`[ensure-native] Rebuilding @grandchef/node-printer for ${target} (current=${current || 'unknown'})`);

  if (target === 'electron') {
    execSync('npx electron-rebuild -f -w @grandchef/node-printer', { stdio: 'inherit' });
  } else {
    execSync('npm rebuild @grandchef/node-printer', { stdio: 'inherit' });
  }

  [sentinelElectron, sentinelNode].forEach(f => exists(f) && fs.unlinkSync(f));

  fs.writeFileSync(target === 'electron' ? sentinelElectron : sentinelNode, new Date().toISOString());
} else {
  console.log(`[ensure-native] Reuse existing build for ${target}`);
}