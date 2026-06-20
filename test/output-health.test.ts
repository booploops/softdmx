import assert from 'node:assert/strict';
import {
  createInitialHealth,
  updateHealthAfterSend,
} from '../src-electron/output/output-health.ts';

const health = createInitialHealth('dest-1', 'artnet', 1, 'primary');
assert.equal(health.online, false);

const updated = updateHealthAfterSend(health, 512, false, 2000);
assert.equal(updated.online, true);
assert.equal(updated.channelCount, 512);
assert.equal(updated.overflow, false);

console.log('output-health tests passed');
