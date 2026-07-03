/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { shouldApplySessionEpoch } from '../../frontend/src/utils/session-epoch.ts';

assert.equal(shouldApplySessionEpoch(3, 3), true);
assert.equal(shouldApplySessionEpoch(3, 4), true);
assert.equal(shouldApplySessionEpoch(5, 4), false);

console.log('session tests passed');
