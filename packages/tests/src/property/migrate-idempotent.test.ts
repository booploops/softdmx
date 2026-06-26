/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fc from 'fast-check';
import type { ShowDocument } from '../../../frontend/src/show/document.ts';
import { migrateShowDocument } from '../../../frontend/src/show/migrate.ts';

const legacyVersionArb = fc.constantFrom('1.0', '1.1', '1.2', '1.3', '1.4', '1.5');
const showNameArb = fc.string({ minLength: 1, maxLength: 32 }).map((name) => name.trim()).filter((name) => name.length > 0);
const isoDateArb = fc.integer({ min: 0, max: 4_000_000_000_000 }).map((ms) => new Date(ms).toISOString());
const fixtureArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 24 }).filter((value) => value.trim().length > 0),
  fixtureId: fc.constantFrom('VRSL_Light5CH', 'generic-wash', 'moving-head'),
});

const partialShowArb: fc.Arbitrary<Partial<ShowDocument>> = fc.record({
  version: legacyVersionArb,
  meta: fc.record({
    name: showNameArb,
    created: isoDateArb,
    modified: isoDateArb,
  }),
  fixtures: fc.array(fixtureArb, { maxLength: 8 }),
  presets: fc.constant([]),
  cues: fc.constant([]),
});

test('migrateShowDocument(migrateShowDocument(x)) deep equals migrateShowDocument(x)', () => {
  fc.assert(
    fc.property(partialShowArb, (partialShow) => {
      const once = migrateShowDocument(partialShow);
      const twice = migrateShowDocument(once);
      assert.deepEqual(twice, once);
    }),
    { numRuns: 75 },
  );
});
