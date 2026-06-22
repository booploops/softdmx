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

const ROUTES = [
  { method: 'POST', path: '/show' },
  { method: 'POST', path: '/scratch/set' },
  { method: 'POST', path: '/scratch/clear' },
  { method: 'POST', path: '/preset/fire' },
  { method: 'POST', path: '/cue/play' },
  { method: 'POST', path: '/cue/stop' },
  { method: 'POST', path: '/cue/stack/go' },
  { method: 'POST', path: '/blackout' },
  { method: 'POST', path: '/grandmaster' },
  { method: 'POST', path: '/audio/enabled' },
  { method: 'POST', path: '/audio/mappings' },
  { method: 'PATCH', path: '/audio/mappings/bad-id' },
  { method: 'DELETE', path: '/audio/mappings/bad-id' },
  { method: 'POST', path: '/channel/set' },
] as const;

describe('malformed REST payloads', () => {
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

  for (const route of ROUTES) {
    it(`${route.method} ${route.path} does not return 500 for garbage JSON`, async () => {
      const res = await fetch(`${testServer.remoteApiUrl}${route.path}`, {
        method: route.method,
        headers: { 'Content-Type': 'application/json' },
        body: '{not valid json',
      });
      assert.notEqual(res.status, 500, `server crashed on ${route.method} ${route.path}`);
      assert.ok(
        res.status === 400 || res.status === 200,
        `expected 400 or 200, got ${res.status} for ${route.method} ${route.path}`,
      );
    });
  }

  it('POST /show with invalid JSON object returns 400, not 500', async () => {
    const res = await fetch(`${testServer.remoteApiUrl}/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ garbage: true }),
    });
    assert.equal(res.status, 400);
  });
});
