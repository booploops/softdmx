import assert from 'node:assert/strict';
import { advanceCuePart, resolveCueParts } from '../../frontend/src/engine/cue-parts.ts';
import type { Cue, CuePlaybackState } from '../../frontend/src/types/index.ts';

const cue: Cue = {
  id: 'cue-1',
  name: 'Test',
  view: 'stack',
  stack: [
    { id: 's1', label: 'Step A', presetId: 'p1', fadeIn: 0 },
    { id: 's2', label: 'Step B', presetId: 'p2', fadeIn: 0, follow: 'timed', followTime: 500 },
  ],
  layers: [],
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
};

const parts = resolveCueParts(cue);
assert.equal(parts.length, 2);
assert.equal(parts[0]?.presetId, 'p1');
assert.equal(parts[1]?.delay, 500);

const state: CuePlaybackState = {
  cueId: cue.id,
  startTime: performance.now(),
  stackStepIndex: 0,
  stackStepStartTime: performance.now(),
};

assert.equal(advanceCuePart(state, cue), true);
assert.equal(state.stackStepIndex, 1);
assert.equal(advanceCuePart(state, cue), false);

console.log('cue-parts tests passed');
