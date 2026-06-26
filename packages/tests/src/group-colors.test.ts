/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  buildFixtureGroupLookup,
  defaultGroupColorForIndex,
  resolveGroupColor,
} from '../../frontend/src/utils/group-colors.ts';

console.log('Running test: group color defaults');
assert.equal(defaultGroupColorForIndex(0), '#e53935');
assert.equal(defaultGroupColorForIndex(10), defaultGroupColorForIndex(0));

console.log('Running test: resolve group color');
assert.equal(resolveGroupColor({ color: '#ff00aa' }, 0), '#ff00aa');
assert.equal(resolveGroupColor({}, 1), defaultGroupColorForIndex(1));

console.log('Running test: fixture group lookup');
const lookup = buildFixtureGroupLookup([
  { name: 'Front', fixtures: ['Light 1', 'Light 2'], color: '#ff0000' },
  { name: 'Back', fixtures: ['Light 3'], color: '#0000ff' },
]);
assert.equal(lookup.get('Light 1')?.color, '#ff0000');
assert.equal(lookup.get('Light 1')?.groupName, 'Front');
assert.equal(lookup.get('Light 3')?.groupName, 'Back');

console.log('All group color tests passed!');
