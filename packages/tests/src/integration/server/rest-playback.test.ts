/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { clearApiTokenEnv, createTestServer, type TestServer } from '../../helpers/server-harness.ts';

describe('REST playback routes', () => {
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

  async function postOk(path: string, body: unknown): Promise<void> {
    const res = await fetch(`${testServer.remoteApiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  }

  it('POST /blackout returns ok', async () => {
    await postOk('/blackout', { value: true });
  });

  it('POST /grandmaster returns ok', async () => {
    await postOk('/grandmaster', { value: 0.75 });
  });

  it('POST /cue/play returns ok', async () => {
    await postOk('/cue/play', { cueId: 'opener' });
  });
});
