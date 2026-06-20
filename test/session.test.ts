import assert from 'node:assert/strict';
import { shouldApplySessionEpoch } from '../src/utils/session-epoch.ts';

assert.equal(shouldApplySessionEpoch(3, 3), true);
assert.equal(shouldApplySessionEpoch(3, 4), true);
assert.equal(shouldApplySessionEpoch(5, 4), false);

console.log('session tests passed');
