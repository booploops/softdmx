/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeCuePlaybackIntensity,
  resolveCueSubmasterScale,
} from '../src/engine/playback-masters.ts';
import type { ShowDocument } from '../src/show/document.ts';

function baseShow(overrides: Partial<ShowDocument> = {}): ShowDocument {
  return {
    version: '1.1',
    meta: { name: 'Test', created: '2026-01-01T00:00:00.000Z', modified: '2026-01-01T00:00:00.000Z' },
    destinations: [],
    fixtures: [],
    groups: [],
    presets: [],
    effects: [],
    cues: [{
      id: 'cue-a',
      name: 'Cue A',
      view: 'timeline',
      layers: [],
      totalDuration: 0,
      isLooping: false,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      priority: 1,
      tags: [],
      created: '2026-01-01T00:00:00.000Z',
      modified: '2026-01-01T00:00:00.000Z',
    }],
    bindings: { midi: [], osc: [] },
    executors: [
      {
        id: 'ex-1',
        name: 'Main',
        pages: 1,
        slots: [
          {
            id: 'slot-1',
            name: 'Slot 1',
            page: 1,
            index: 0,
            cueId: 'cue-a',
            submasterId: 'sub-2',
          },
        ],
      },
    ],
    submasters: [
      { id: 'sub-1', name: 'Target bus', value: 0.5, mode: 'cue-intensity', targets: ['cue-a'] },
      { id: 'sub-2', name: 'Slot bus', value: 0.5, mode: 'cue-intensity' },
    ],
    ...overrides,
  };
}

describe('playback masters', () => {
  it('combines state intensity with playback bus and cue submasters', () => {
    const value = computeCuePlaybackIntensity(0.8, 0.5, 0.5);
    assert.equal(value, 0.2);
  });

  it('resolves cue submasters from targets and executor slot links', () => {
    const show = baseShow();
    assert.equal(resolveCueSubmasterScale(show, 'cue-a'), 0.25);
  });
});

console.log('All playback master tests passed!');
