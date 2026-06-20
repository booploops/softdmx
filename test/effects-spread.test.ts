import assert from 'node:assert/strict';
import { computeSpreadPhase, waveformValue } from '../src/engine/effects/spread.ts';

assert.ok(computeSpreadPhase(0, 4, 1) >= 0);
assert.ok(computeSpreadPhase(3, 4, 1, 2) !== computeSpreadPhase(0, 4, 1, 2));
assert.equal(waveformValue('square', 0), 1);
assert.equal(waveformValue('square', 0.6), 0);
assert.ok(waveformValue('sine', 0.25) > 0.9);

console.log('effects-spread tests passed');
