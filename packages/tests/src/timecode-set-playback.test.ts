/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  getActiveTimelineCuesAtTimecode,
  getCueTimecodeOutSeconds,
} from '../../frontend/src/engine/timecode-set-playback.ts';
import type { Cue } from '../../frontend/src/types/cue.ts';

console.log('Running test: active timeline cues at timecode');

const cue: Cue = {
  id: 'cue-1',
  name: 'Main',
  view: 'timeline',
  layers: [
    {
      id: 'layer-1',
      name: 'Main',
      frames: [{ name: 'Look', type: 'channels', channels: [], duration: 5000 }],
      enabled: true,
      opacity: 1,
      blendMode: 'replace',
      solo: false,
    },
  ],
  stack: [],
  totalDuration: 5000,
  isLooping: false,
  fadeInDuration: 0,
  fadeOutDuration: 0,
  priority: 1,
  tags: [],
  timecodeIn: 10,
  timecodeOut: 20,
  created: '2026-01-01T00:00:00.000Z',
  modified: '2026-01-01T00:00:00.000Z',
};

assert.equal(getCueTimecodeOutSeconds(cue), 20);

const before = getActiveTimelineCuesAtTimecode([cue], 5);
assert.equal(before.length, 0);

const active = getActiveTimelineCuesAtTimecode([cue], 12);
assert.equal(active.length, 1);
assert.equal(active[0]?.localMs, 2000);

const after = getActiveTimelineCuesAtTimecode([cue], 20);
assert.equal(after.length, 0);

console.log('All timecode set playback tests passed!');
