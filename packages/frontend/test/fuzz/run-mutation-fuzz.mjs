/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmptyShow } from '../../src/show/document.ts';
import { parseShowDocument, serializeShowDocument } from '../../src/show/io.ts';
import { loadFixtureYaml } from '../../src/fixture-library/fixture-yaml.ts';
import { parseDirectOscAddress } from '../../src/utils/osc-parser.ts';

const fuzzDir = path.dirname(fileURLToPath(import.meta.url));
const iterations = Number(process.env.FUZZ_MUTATIONS ?? 1000);

function readCorpusSeeds(subdir) {
  const corpusPath = path.join(fuzzDir, 'corpus', subdir);
  return readdirSync(corpusPath).map((name) => readFileSync(path.join(corpusPath, name), 'utf8'));
}

function mutate(input) {
  if (!input.length) {
    return String.fromCharCode(32 + Math.floor(Math.random() * 95));
  }

  const chars = input.split('');
  const op = Math.floor(Math.random() * 4);

  switch (op) {
    case 0: {
      const index = Math.floor(Math.random() * (chars.length + 1));
      const insert = String.fromCharCode(32 + Math.floor(Math.random() * 95));
      chars.splice(index, 0, insert);
      break;
    }
    case 1: {
      if (chars.length > 0) {
        const index = Math.floor(Math.random() * chars.length);
        chars.splice(index, 1);
      }
      break;
    }
    case 2: {
      if (chars.length > 0) {
        const index = Math.floor(Math.random() * chars.length);
        chars[index] = String.fromCharCode(32 + Math.floor(Math.random() * 95));
      }
      break;
    }
    default:
      break;
  }

  return chars.join('');
}

function fuzzTarget(name, seeds, run) {
  let crashes = 0;

  for (let i = 0; i < iterations; i += 1) {
    const seed = seeds[Math.floor(Math.random() * seeds.length)] ?? '';
    const input = mutate(seed);

    try {
      run(input);
    } catch (error) {
      if (error instanceof Error && /process/.test(error.message)) {
        crashes += 1;
        throw error;
      }
    }
  }

  assert.equal(crashes, 0, `${name} must not crash the process`);
  console.log(`${name}: ${iterations} mutations completed without process crash`);
}

const showSeeds = [
  serializeShowDocument(createEmptyShow('Mutation Seed')),
  ...readCorpusSeeds('show-yaml'),
];

const fixtureSeeds = readCorpusSeeds('fixture-yaml');
const oscSeeds = readCorpusSeeds('osc-address');

fuzzTarget('parseShowDocument', showSeeds, (input) => {
  try {
    parseShowDocument(input);
  } catch {
    // expected for invalid documents
  }
});

fuzzTarget('loadFixtureYaml', fixtureSeeds, (input) => {
  try {
    loadFixtureYaml(input);
  } catch {
    // expected for invalid fixtures
  }
});

fuzzTarget('parseDirectOscAddress', oscSeeds, (input) => {
  parseDirectOscAddress(input);
});

console.log('Mutation fuzz completed.');
