import assert from 'node:assert/strict';
import { createEmptyShow } from '../../frontend/src/show/document.ts';
import {
  alignValueForFixture,
  applyWingOffset,
  wingScaleForIndex,
} from '../../frontend/src/engine/align-wings.ts';

assert.equal(wingScaleForIndex(0, 4, 2, 'out'), 1);
assert.equal(wingScaleForIndex(1, 4, 2, 'in'), 0);

const show = createEmptyShow('Align');
show.fixtures.push({
  name: 'A',
  fixtureId: 'VRSL_Light5CH',
  position: { x: 10, y: 20, pan: 128, tilt: 64 },
});

assert.equal(alignValueForFixture(show, 'A', 'x'), 10);
assert.equal(alignValueForFixture(show, 'A', 'pan'), 128);
assert.equal(applyWingOffset(128, 0), 1);
assert.equal(applyWingOffset(128, 1), 256);

console.log('align-wings tests passed');
