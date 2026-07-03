/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  buildAttributeDefinitions,
  inferAttributeFeature,
  inferAttributeMerge,
} from '../../frontend/src/engine/attributes.ts';
import type { FixtureDefinition } from '../../frontend/src/types/index.ts';

const sampleFixture: FixtureDefinition = {
  id: 'test-fixture',
  name: 'Test Fixture',
  channels: [
    { name: 'Dimmer', type: 'intensity' },
    { name: 'Red', type: 'color' },
    { name: 'Pan', type: 'position' },
    { name: 'Gobo', type: 'gobo' },
  ],
};

assert.equal(inferAttributeFeature('intensity', 'Dimmer'), 'dimmer');
assert.equal(inferAttributeFeature('color', 'Red'), 'color');
assert.equal(inferAttributeMerge('dimmer'), 'htp');
assert.equal(inferAttributeMerge('position'), 'ltp');

const attrs = buildAttributeDefinitions(sampleFixture);
assert.equal(attrs.length, 4);
assert.equal(attrs[0]?.feature, 'dimmer');
assert.equal(attrs[2]?.feature, 'position');

console.log('attributes tests passed');
