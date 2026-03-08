#!/usr/bin/env node
// Runs before `yarn install` / `yarn add`:
// Removes @thiagoelg/node-printer's install script so yarn doesn't try
// (and fail) to build it automatically — we rebuild it in postinstall.

const path = require('path')
const fs = require('fs')
const root = path.join(__dirname, '..')

const printerPkg = path.join(
  root,
  'node_modules',
  '@thiagoelg',
  'node-printer',
  'package.json',
)
if (fs.existsSync(printerPkg)) {
  const pkg = JSON.parse(fs.readFileSync(printerPkg, 'utf8'))
  if (pkg.scripts && pkg.scripts.install) {
    delete pkg.scripts.install
    fs.writeFileSync(printerPkg, JSON.stringify(pkg, null, 2))
    console.log('[preinstall] Removed auto-build from @thiagoelg/node-printer')
  }
}
