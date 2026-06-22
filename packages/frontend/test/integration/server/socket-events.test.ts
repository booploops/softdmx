/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { io as ioClient, type Socket } from 'socket.io-client';
import { createEmptyShow } from '../../../src/show/document.ts';
import { clearApiTokenEnv, createTestServer, type TestServer } from '../../helpers/server-harness.ts';

function connectClient(url: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(url, { transports: ['websocket'] });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('Socket.IO remote events', () => {
  let testServer: TestServer;
  let tokenEnv: { restore: () => void };
  let socket: Socket;

  before(async () => {
    tokenEnv = clearApiTokenEnv();
    testServer = await createTestServer({ withSocketHandlers: true });
    socket = await connectClient(testServer.url);
  });

  after(async () => {
    socket.disconnect();
    await testServer.close();
    tokenEnv.restore();
  });

  it('receives show:state after POST /show', async () => {
    const show = createEmptyShow('Socket Broadcast');
    const statePromise = waitForEvent<{ meta: { name: string } }>(socket, 'show:state');

    const res = await fetch(`${testServer.remoteApiUrl}/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(show),
    });
    assert.equal(res.status, 200);

    const state = await statePromise;
    assert.equal(state.meta.name, 'Socket Broadcast');
  });

  it('show:get returns current show via show:state', async () => {
    const show = createEmptyShow('Socket Get');
    await fetch(`${testServer.remoteApiUrl}/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(show),
    });

    const statePromise = waitForEvent<{ meta: { name: string } }>(socket, 'show:state');
    socket.emit('show:get');
    const state = await statePromise;
    assert.equal(state.meta.name, 'Socket Get');
  });
});
