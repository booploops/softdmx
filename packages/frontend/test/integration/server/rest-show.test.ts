/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createEmptyShow } from '../../../src/show/document.ts';
import { clearApiTokenEnv, createTestServer, type TestServer } from '../../helpers/server-harness.ts';

describe('REST /show', () => {
  let testServer: TestServer;
  let tokenEnv: { restore: () => void };

  before(async () => {
    tokenEnv = clearApiTokenEnv();
    testServer = await createTestServer();
  });

  after(async () => {
    await testServer.close();
    tokenEnv.restore();
  });

  it('GET returns 404 when no show is loaded', async () => {
    const res = await fetch(`${testServer.remoteApiUrl}/show`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'No show loaded');
  });

  it('POST valid show then GET returns it', async () => {
    const show = createEmptyShow('Integration Test');
    show.fixtures.push({ name: 'Light 1', fixtureId: 'VRSL_Light5CH' });

    const postRes = await fetch(`${testServer.remoteApiUrl}/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(show),
    });
    assert.equal(postRes.status, 200);
    assert.deepEqual(await postRes.json(), { ok: true });
    assert.equal(testServer.outputManager.showfiles.length, 1);

    const getRes = await fetch(`${testServer.remoteApiUrl}/show`);
    assert.equal(getRes.status, 200);
    const loaded = await getRes.json();
    assert.equal(loaded.meta.name, 'Integration Test');
    assert.equal(loaded.version, show.version);
    assert.equal(loaded.fixtures.length, 1);
  });

  it('POST invalid show returns 400', async () => {
    const res = await fetch(`${testServer.remoteApiUrl}/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: '99.0', meta: { name: 'Bad' } }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'Invalid show document payload');
  });
});
