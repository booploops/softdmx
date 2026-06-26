/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  dmxToIndex,
  getIndexedSlotLabels,
  indexToDmx,
  isIndexedChannel,
} from '../../frontend/src/engine/indexed-channel.ts';
import type { FixtureChannelDefinition } from '../../frontend/src/types';

const goboChannel: FixtureChannelDefinition = {
  name: 'Gobo Index',
  type: 'effect',
  minValue: 0,
  maxValue: 255,
  defaultValue: 8,
  controlMode: 'indexed',
  indexedSlots: 16,
  indexedLabels: ['Open', 'Gobo 2'],
};

console.log('Running test: indexed channel conversions');
assert.equal(isIndexedChannel(goboChannel), true);
assert.equal(indexToDmx(0, goboChannel), 8);
assert.equal(indexToDmx(15, goboChannel), 248);
assert.equal(dmxToIndex(8, goboChannel), 0);
assert.equal(dmxToIndex(248, goboChannel), 15);
assert.equal(getIndexedSlotLabels({ ...goboChannel, indexedLabels: undefined })[0], '1');
const twoSlotChannel = { ...goboChannel, indexedSlots: 2, indexedLabels: ['Open', 'Gobo 2'] };
assert.deepEqual(getIndexedSlotLabels(twoSlotChannel), ['Open', 'Gobo 2']);
console.log('Indexed channel tests passed!');
