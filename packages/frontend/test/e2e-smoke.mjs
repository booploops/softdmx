/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { createEmptyShow } from '../src/types/show-document.ts';
import { serializeShowDocument, parseShowDocument } from '../src/utils/show-io.ts';
import { mergeLayers } from '../src/engine/types.ts';
import { scratchToLayer } from '../src/engine/layers/scratch.ts';

test('smoke: cli help is available', () => {
  const result = spawnSync(process.execPath, ['../client/scripts/softdmx-cli.mjs', 'help'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SoftDMX CLI/);
  assert.match(result.stdout, /load-show/);
  assert.match(result.stdout, /set-channel/);
});

test('smoke: show roundtrip and scratch merge', () => {
  const show = createEmptyShow('Smoke Show');
  show.fixtures.push({ name: 'Smoke 1', fixtureId: 'VRSL_Light5CH' });

  const serialized = serializeShowDocument(show);
  const parsed = parseShowDocument(serialized);
  assert.equal(parsed.meta.name, 'Smoke Show');
  assert.equal(parsed.version, '1.5');

  const baseChannels = [
    { id: 1, path: 'show://Smoke 1/1', value: 100, attributeType: 'intensity' },
    { id: 2, path: 'show://Smoke 1/2', value: 100, attributeType: 'color' },
    { id: 3, path: 'show://Smoke 1/3', value: 100, attributeType: 'color' },
    { id: 4, path: 'show://Smoke 1/4', value: 100, attributeType: 'color' },
    { id: 5, path: 'show://Smoke 1/5', value: 0, attributeType: 'effect' },
  ];

  const scratch = scratchToLayer([
    {
      path: 'show://Smoke 1/1',
      value: 210,
      attributeType: 'intensity',
      touchedAt: Date.now(),
    },
  ]);

  const merged = mergeLayers(baseChannels, [scratch], { grandMaster: 1, blackout: false });
  const dimmer = merged.find((channel) => channel.path === 'show://Smoke 1/1');
  assert.equal(dimmer?.value, 210);
});
