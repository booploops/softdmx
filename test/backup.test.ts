import assert from 'node:assert/strict';
import {
  getLastPrimaryState,
  isPrimaryAlive,
  markPrimaryHeartbeat,
  publishPrimaryState,
  setStandbyActive,
} from '../src-electron/output/backup-coordinator.ts';

markPrimaryHeartbeat(1000);
assert.equal(isPrimaryAlive(500, 1200), true);
assert.equal(isPrimaryAlive(100, 1200), false);

publishPrimaryState([{ id: 1, path: 'show://A/1', value: 128, attributeType: 'intensity' }]);
assert.equal(getLastPrimaryState()[0]?.value, 128);

setStandbyActive(true);
setStandbyActive(false);

console.log('backup tests passed');
