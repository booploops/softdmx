#!/usr/bin/env node

/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
