/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import type { ShowDocument } from '../../../frontend/src/show/document.ts';
import { createEmptyShow } from '../../../frontend/src/show/document.ts';
import type { RemoteContext } from '../../../client/src-electron/server/context.ts';
import { ScratchAuthority } from '../../../client/src-electron/server/scratch-authority.ts';
import { registerRemoteRestRoutes } from '../../../client/src-electron/server/api/remote-rest.ts';

const API_PREFIX = '/api/v1/remote';
const originalToken = process.env.SOFTDMX_API_TOKEN;

type EmittedEvent = { event: string; payload: unknown };

function createMockContext() {
  let show: ShowDocument | null = null;
  const emitted: EmittedEvent[] = [];
  let showfile: ShowDocument | null = null;

  const ctx: RemoteContext = {
    io: {
      emit: (event: string, payload?: unknown) => {
        emitted.push({ event, payload });
      },
    } as RemoteContext['io'],
    outputManager: {
      setShowfile: (nextShow: ShowDocument) => {
        showfile = nextShow;
      },
    } as RemoteContext['outputManager'],
    scratchAuthority: new ScratchAuthority(),
    getShow: () => show,
    setShow: (nextShow: ShowDocument) => {
      show = nextShow;
    },
  };

  return { ctx, emitted, getShowfile: () => showfile };
}

async function createTestServer(ctx: RemoteContext) {
  const app = new Hono() as Hono & { close: () => Promise<void> };
  registerRemoteRestRoutes(app, ctx);
  app.close = async () => {};
  return app;
}

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.SOFTDMX_API_TOKEN;
  } else {
    process.env.SOFTDMX_API_TOKEN = originalToken;
  }
});

test('GET /show returns 404 when no show is loaded', async () => {
  delete process.env.SOFTDMX_API_TOKEN;
  const { ctx } = createMockContext();
  const server = await createTestServer(ctx);

  const response = await server.request(`${API_PREFIX}/show`, { method: 'GET' });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'No show loaded' });

  await server.close();
});

test('POST /show accepts a valid show document', async () => {
  delete process.env.SOFTDMX_API_TOKEN;
  const { ctx, emitted, getShowfile } = createMockContext();
  const server = await createTestServer(ctx);
  const show = createEmptyShow('Remote Show');

  const response = await server.request(`${API_PREFIX}/show`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(show),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(ctx.getShow()?.meta.name, 'Remote Show');
  assert.equal(getShowfile()?.meta.name, 'Remote Show');
  assert.ok(emitted.some((entry) => entry.event === 'show:state'));

  await server.close();
});

test('POST /show rejects invalid show documents', async () => {
  delete process.env.SOFTDMX_API_TOKEN;
  const { ctx } = createMockContext();
  const server = await createTestServer(ctx);

  const response = await server.request(`${API_PREFIX}/show`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ version: '9.9', meta: { name: 'Bad' } }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid show document payload' });
  assert.equal(ctx.getShow(), null);

  await server.close();
});

test('routes return 401 when SOFTDMX_API_TOKEN is set without credentials', async () => {
  process.env.SOFTDMX_API_TOKEN = 'route-secret';
  const { ctx } = createMockContext();
  const server = await createTestServer(ctx);

  const unauthorized = await server.request(`${API_PREFIX}/show`, { method: 'GET' });
  assert.equal(unauthorized.status, 401);
  assert.deepEqual(await unauthorized.json(), { error: 'Unauthorized' });

  const authorized = await server.request(`${API_PREFIX}/show`, {
    method: 'GET',
    headers: { authorization: 'Bearer route-secret' },
  });
  assert.equal(authorized.status, 404);

  await server.close();
});

test('POST /scratch/set emits scratch layers through authority', async () => {
  delete process.env.SOFTDMX_API_TOKEN;
  const { ctx, emitted } = createMockContext();
  const server = await createTestServer(ctx);

  const response = await server.request(`${API_PREFIX}/scratch/set`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ path: 'show://Light 1/1', value: 128 }),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as { ok: boolean; ack: { seq: number }; seq: number };
  assert.equal(body.ok, true);
  assert.ok(body.ack.seq >= 1);
  assert.ok(emitted.some((entry) => entry.event === 'scratch:layers'));
  assert.ok(emitted.some((entry) => entry.event === 'remote:scratch:set'));

  await server.close();
});

test('POST /blackout emits remote blackout value', async () => {
  delete process.env.SOFTDMX_API_TOKEN;
  const { ctx, emitted } = createMockContext();
  const server = await createTestServer(ctx);

  const response = await server.request(`${API_PREFIX}/blackout`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ value: true }),
  });

  assert.equal(response.status, 200);
  assert.equal(emitted.find((entry) => entry.event === 'remote:blackout')?.payload, true);

  await server.close();
});

test('POST /grandmaster clamps values to 0-1', async () => {
  delete process.env.SOFTDMX_API_TOKEN;
  const { ctx, emitted } = createMockContext();
  const server = await createTestServer(ctx);

  const high = await server.request(`${API_PREFIX}/grandmaster`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ value: 2.5 }),
  });
  assert.equal(high.status, 200);
  assert.equal(emitted.find((entry) => entry.event === 'remote:grandmaster')?.payload, 1);

  const low = await server.request(`${API_PREFIX}/grandmaster`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(-0.5),
  });
  assert.equal(low.status, 200);
  assert.equal(
    emitted.filter((entry) => entry.event === 'remote:grandmaster').at(-1)?.payload,
    0,
  );

  await server.close();
});
