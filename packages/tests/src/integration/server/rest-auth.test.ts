/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createEmptyShow } from '../../../../frontend/src/show/document.ts';
import { createTestServer, saveApiTokenEnv, type TestServer } from '../../helpers/server-harness.ts';

const TEST_TOKEN = 'integration-test-token';

describe('REST auth', () => {
  let testServer: TestServer;
  let tokenEnv: { restore: () => void };

  before(async () => {
    tokenEnv = saveApiTokenEnv();
    process.env.SOFTDMX_API_TOKEN = TEST_TOKEN;
    testServer = await createTestServer();
  });

  after(async () => {
    await testServer.close();
    tokenEnv.restore();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await fetch(`${testServer.remoteApiUrl}/show`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'Unauthorized');
  });

  it('returns 200 with valid Bearer token', async () => {
    const show = createEmptyShow('Auth Test');
    const postRes = await fetch(`${testServer.remoteApiUrl}/show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify(show),
    });
    assert.equal(postRes.status, 200);
    assert.deepEqual(await postRes.json(), { ok: true });

    const getRes = await fetch(`${testServer.remoteApiUrl}/show`, {
      headers: { Authorization: `Bearer ${TEST_TOKEN}` },
    });
    assert.equal(getRes.status, 200);
    const loaded = await getRes.json();
    assert.equal(loaded.meta.name, 'Auth Test');
  });
});
