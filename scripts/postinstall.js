#!/usr/bin/env node
// Patches @thiagoelg/node-printer/binding.gyp and rebuilds the native module.
// Fixes two upstream bugs:
//   - binding.gyp calls `python` instead of `python3`
//   - binding.gyp uses -std=c++14 but Node >=20 headers require C++17

const { execSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const root = path.join(__dirname, '..')
const printerDir = path.join(root, 'node_modules', '@thiagoelg', 'node-printer')
const bindingPath = path.join(printerDir, 'binding.gyp')

if (!fs.existsSync(bindingPath)) {
  console.log('[postinstall] node-printer not found, skipping rebuild')
  process.exit(0)
}

let content = fs.readFileSync(bindingPath, 'utf8')
let changed = false
if (content.includes('"python"')) {
  content = content.replace('"python"', '"python3"')
  changed = true
}
if (content.includes('c++14')) {
  content = content.replace('c++14', 'c++17')
  changed = true
}
if (changed) {
  fs.writeFileSync(bindingPath, content)
  console.log('[postinstall] Patched binding.gyp (python3, c++17)')
}

const nodeGypScript = path.join(
  path.dirname(process.execPath),
  '..',
  'lib',
  'node_modules',
  'npm',
  'node_modules',
  'node-gyp',
  'bin',
  'node-gyp.js',
)
if (!fs.existsSync(nodeGypScript)) {
  console.error('[postinstall] node-gyp not found at', nodeGypScript)
  process.exit(1)
}

console.log('[postinstall] Building @thiagoelg/node-printer...')
execSync(`node "${nodeGypScript}" rebuild`, {
  cwd: printerDir,
  stdio: 'inherit',
})
console.log('[postinstall] node-printer built successfully')
