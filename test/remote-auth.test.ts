/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  extractTokenFromHeaders,
  extractTokenFromSocketHandshake,
  getRequiredRemoteApiToken,
  isRemoteApiTokenAuthorized,
} from '../src-electron/server/auth/remote-token.ts';

console.log('Running test: remote API token optional when env unset');
const originalToken = process.env.SOFTDMX_API_TOKEN;
delete process.env.SOFTDMX_API_TOKEN;
assert.equal(getRequiredRemoteApiToken(), null);
assert.equal(isRemoteApiTokenAuthorized(null), true);
assert.equal(isRemoteApiTokenAuthorized('anything'), true);

console.log('Running test: remote API token required when env set');
process.env.SOFTDMX_API_TOKEN = 'secret-token';
assert.equal(getRequiredRemoteApiToken(), 'secret-token');
assert.equal(isRemoteApiTokenAuthorized(null), false);
assert.equal(isRemoteApiTokenAuthorized('wrong'), false);
assert.equal(isRemoteApiTokenAuthorized('secret-token'), true);

console.log('Running test: bearer and x-api-token header parsing');
assert.equal(
  extractTokenFromHeaders({ authorization: 'Bearer abc123' }),
  'abc123',
);
assert.equal(
  extractTokenFromHeaders({ 'x-api-token': 'xyz' }),
  'xyz',
);

console.log('Running test: socket handshake token parsing');
assert.equal(
  extractTokenFromSocketHandshake({ auth: { token: 'handshake-token' } }),
  'handshake-token',
);
assert.equal(
  extractTokenFromSocketHandshake({
    headers: { authorization: 'Bearer header-token' },
  }),
  'header-token',
);

if (originalToken === undefined) {
  delete process.env.SOFTDMX_API_TOKEN;
} else {
  process.env.SOFTDMX_API_TOKEN = originalToken;
}

console.log('All remote auth tests passed!');
