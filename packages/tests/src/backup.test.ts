/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  getLastPrimaryState,
  isPrimaryAlive,
  markPrimaryHeartbeat,
  publishPrimaryState,
  setStandbyActive,
} from '../../client/src-electron/backup/coordinator.ts';

markPrimaryHeartbeat(1000);
assert.equal(isPrimaryAlive(500, 1200), true);
assert.equal(isPrimaryAlive(100, 1200), false);

publishPrimaryState([{ id: 1, path: 'show://A/1', value: 128, attributeType: 'intensity' }]);
assert.equal(getLastPrimaryState()[0]?.value, 128);

setStandbyActive(true);
setStandbyActive(false);

console.log('backup tests passed');
