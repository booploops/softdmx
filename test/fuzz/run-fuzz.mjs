/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const fuzzDir = path.dirname(fileURLToPath(import.meta.url));
const ci = process.env.FUZZ_CI === '1';

if (ci) {
  process.env.FUZZ_CI = '1';
}

console.log(ci ? 'Running CI fuzz suite...' : 'Running fuzz suite...');

const jazzer = spawnSync(process.execPath, [path.join(fuzzDir, 'run-jazzer.mjs')], {
  stdio: 'inherit',
  env: process.env,
});

if (jazzer.status === 0) {
  process.exit(0);
}

console.warn('\nJazzer harnesses unavailable or failed; falling back to mutation fuzz.\n');

const mutation = spawnSync(
  process.execPath,
  [
    '--import',
    path.join(fuzzDir, '../helpers/register-src-alias.mjs'),
    '--experimental-strip-types',
    path.join(fuzzDir, 'run-mutation-fuzz.mjs'),
  ],
  { stdio: 'inherit', env: process.env },
);

process.exit(mutation.status ?? 1);
