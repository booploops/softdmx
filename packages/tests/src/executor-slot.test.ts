/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import type { ExecutorSlot } from '../../engine/src/show/document.ts';
import {
  assignExecutorSlotContent,
  resolveExecutorSlotContentType,
} from '../../engine/src/utils/executor-slot.ts';

function makeSlot(): ExecutorSlot {
  return {
    id: 'slot-1',
    name: 'Slot 1',
    page: 1,
    index: 0,
    mode: 'go',
  };
}

const empty = makeSlot();
assert.equal(resolveExecutorSlotContentType(empty), 'none');

assignExecutorSlotContent(empty, 'cue');
assert.equal(empty.contentType, 'cue');
assert.equal(empty.cueId, undefined);
assert.equal(resolveExecutorSlotContentType(empty), 'cue');

assignExecutorSlotContent(empty, 'cue', 'cue-a');
assert.equal(empty.cueId, 'cue-a');
assert.equal(empty.contentType, 'cue');
assert.equal(resolveExecutorSlotContentType(empty), 'cue');

assignExecutorSlotContent(empty, 'preset', 'preset-b');
assert.equal(empty.presetId, 'preset-b');
assert.equal(empty.cueId, undefined);
assert.equal(resolveExecutorSlotContentType(empty), 'preset');

assignExecutorSlotContent(empty, 'effect', 'fx-c');
assert.equal(empty.effectId, 'fx-c');
assert.equal(empty.presetId, undefined);
assert.equal(resolveExecutorSlotContentType(empty), 'effect');

assignExecutorSlotContent(empty, 'audio', 'map-d');
assert.equal(empty.audioMappingId, 'map-d');
assert.equal(empty.effectId, undefined);
assert.equal(resolveExecutorSlotContentType(empty), 'audio');

assignExecutorSlotContent(empty, 'audio');
assert.equal(empty.contentType, 'audio');
assert.equal(empty.audioMappingId, undefined);
assert.equal(resolveExecutorSlotContentType(empty), 'audio');

assignExecutorSlotContent(empty, 'none');
assert.equal(resolveExecutorSlotContentType(empty), 'none');
assert.equal(empty.effectId, undefined);
assert.equal(empty.audioMappingId, undefined);
assert.equal(empty.contentType, undefined);

console.log('executor-slot tests passed');
