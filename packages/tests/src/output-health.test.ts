/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  createInitialHealth,
  updateHealthAfterSend,
} from '../../frontend/src/utils/output-health.ts';

const health = createInitialHealth('dest-1', 'artnet', 1, 'primary');
assert.equal(health.online, false);

const updated = updateHealthAfterSend(health, 512, false, 2000);
assert.equal(updated.online, true);
assert.equal(updated.channelCount, 512);
assert.equal(updated.overflow, false);

console.log('output-health tests passed');
