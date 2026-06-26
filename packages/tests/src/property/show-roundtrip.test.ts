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
import { createEmptyShow } from '../../../frontend/src/show/document.ts';
import { parseShowDocument, serializeShowDocument } from '../../../frontend/src/show/io.ts';

const showNameArb = fc.string({ minLength: 1, maxLength: 40 }).filter((name) => name.trim().length > 0);
const fixtureCountArb = fc.integer({ min: 0, max: 12 });

test('serializeShowDocument(parseShowDocument(x)) preserves meta.name, fixture count, version 1.5', () => {
  fc.assert(
    fc.property(showNameArb, fixtureCountArb, (name, fixtureCount) => {
      const show = createEmptyShow(name.trim());
      for (let index = 0; index < fixtureCount; index += 1) {
        show.fixtures.push({
          name: `Fixture ${index + 1}`,
          fixtureId: 'VRSL_Light5CH',
        });
      }

      const roundTripped = parseShowDocument(serializeShowDocument(show));

      assert.equal(roundTripped.meta.name, name.trim());
      assert.equal(roundTripped.fixtures.length, fixtureCount);
      assert.equal(roundTripped.version, '1.5');
    }),
    { numRuns: 75 },
  );
});
