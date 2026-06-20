#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const yarnCmd = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';

const modules = ['abletonlink', 'serialport'];

function runRebuild() {
  const rebuild = spawnSync(
    yarnCmd,
    ['exec', 'electron-rebuild', '-f', '-w', modules.join(',')],
    { cwd: root, stdio: 'inherit' }
  );

  if (rebuild.status !== 0) {
    console.warn('rebuild-native: electron-rebuild failed; native modules may not load until rebuilt');
    process.exit(0);
  }

  console.log('rebuild-native: native modules rebuilt');
}

runRebuild();
