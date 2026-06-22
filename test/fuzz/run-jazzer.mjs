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
const repoRoot = path.resolve(fuzzDir, '../..');
const registerAlias = path.join(repoRoot, 'test/helpers/register-src-alias.mjs');
const maxTotalTime = process.env.FUZZ_CI === '1' ? '15' : '30';

const harnesses = [
  { file: 'show-yaml.jazzer.mjs', corpus: 'show-yaml' },
  { file: 'fixture-yaml.jazzer.mjs', corpus: 'fixture-yaml' },
  { file: 'osc-address.jazzer.mjs', corpus: 'osc-address' },
];

const nodeOptions = [
  process.env.NODE_OPTIONS,
  `--import ${registerAlias}`,
  '--experimental-strip-types',
].filter(Boolean).join(' ');

const env = {
  ...process.env,
  NODE_OPTIONS: nodeOptions,
};

for (const harness of harnesses) {
  const target = path.join(fuzzDir, 'harnesses', harness.file);
  const corpus = path.join(fuzzDir, 'corpus', harness.corpus);

  console.log(`\n=== Fuzzing ${harness.file} ===`);
  const result = spawnSync(
    'npx',
    ['jazzer', target, corpus, '--', `-max_total_time=${maxTotalTime}`],
    { cwd: repoRoot, env, stdio: 'inherit' },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nAll Jazzer harnesses completed.');
