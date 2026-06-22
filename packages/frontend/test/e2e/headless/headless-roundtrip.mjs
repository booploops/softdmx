/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEmptyShow } from '../../../src/show/document.ts';
import { serializeShowDocument, parseShowDocument } from '../../../src/show/io.ts';
import { mergeLayers } from '../../../src/engine/types.ts';
import { scratchToLayer } from '../../../src/engine/layers/scratch.ts';

test('headless: show serialize/parse roundtrip', () => {
  const show = createEmptyShow('Headless Roundtrip');
  show.fixtures.push({ name: 'Wash 1', fixtureId: 'VRSL_Light5CH' });
  show.groups.push({ name: 'All', fixtures: ['Wash 1'] });

  const serialized = serializeShowDocument(show);
  const parsed = parseShowDocument(serialized);

  assert.equal(parsed.meta.name, 'Headless Roundtrip');
  assert.equal(parsed.version, '1.5');
  assert.equal(parsed.fixtures.length, 1);
  assert.equal(parsed.groups[0]?.fixtures[0], 'Wash 1');
});

test('headless: scratch merge over serialized show channels', () => {
  const show = createEmptyShow('Merge Smoke');
  show.fixtures.push({ name: 'Wash 1', fixtureId: 'VRSL_Light5CH' });

  const parsed = parseShowDocument(serializeShowDocument(show));
  const fixtureName = parsed.fixtures[0]?.name;
  assert.ok(fixtureName);

  const baseChannels = [
    { id: 1, path: `show://${fixtureName}/1`, value: 100, attributeType: 'intensity' },
    { id: 2, path: `show://${fixtureName}/2`, value: 100, attributeType: 'color' },
  ];

  const scratch = scratchToLayer([
    {
      path: `show://${fixtureName}/1`,
      value: 210,
      attributeType: 'intensity',
      touchedAt: Date.now(),
    },
  ]);

  const merged = mergeLayers(baseChannels, [scratch], { grandMaster: 1, blackout: false });
  const dimmer = merged.find((channel) => channel.path === `show://${fixtureName}/1`);
  assert.equal(dimmer?.value, 210);
});
