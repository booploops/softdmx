/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createServer, type Server as HTTPServer } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import { Hono } from 'hono';
import { Server } from 'socket.io';
import { registerRemoteRestRoutes } from '../../../client/src-electron/server/api/remote-rest.ts';
import {
  extractTokenFromSocketHandshake,
  getRequiredRemoteApiToken,
  isRemoteApiTokenAuthorized,
} from '../../../client/src-electron/server/auth/remote-token.ts';
import type { RemoteContext } from '../../../client/src-electron/server/context.ts';
import { ScratchAuthority } from '../../../client/src-electron/server/scratch-authority.ts';
import { registerRemoteHandlers } from '../../../client/src-electron/server/socket/remote.ts';
import type { ShowDocument } from '../../../frontend/src/show/document.ts';

export interface MockOutputManager {
  setShowfile: (show: ShowDocument) => void;
  showfiles: ShowDocument[];
}

export interface TestServer {
  server: HTTPServer;
  io: Server;
  url: string;
  remoteApiUrl: string;
  ctx: RemoteContext;
  outputManager: MockOutputManager;
  close: () => Promise<void>;
}

export interface CreateTestServerOptions {
  withSocketHandlers?: boolean;
}

function getIOCors() {
  return {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-token'],
    credentials: true,
  };
}

export async function createTestServer(
  options: CreateTestServerOptions = {},
): Promise<TestServer> {
  let currentShow: ShowDocument | null = null;
  const showfiles: ShowDocument[] = [];
  const outputManager: MockOutputManager = {
    showfiles,
    setShowfile(show: ShowDocument) {
      showfiles.push(show);
    },
  };

  const app = new Hono();
  const server = createServer(getRequestListener(app.fetch));
  const io = new Server(server, { cors: getIOCors() });

  const requiredToken = getRequiredRemoteApiToken();
  if (requiredToken) {
    io.use((socket, next) => {
      const token = extractTokenFromSocketHandshake(socket.handshake);
      if (!isRemoteApiTokenAuthorized(token, requiredToken)) {
        next(new Error('Unauthorized'));
        return;
      }
      next();
    });
  }

  const scratchAuthority = new ScratchAuthority(() => currentShow?.programmer?.conflictMode ?? 'attribute-merge');

  const ctx: RemoteContext = {
    io,
    outputManager: outputManager as unknown as RemoteContext['outputManager'],
    scratchAuthority,
    getShow: () => currentShow,
    setShow: (show: ShowDocument) => {
      currentShow = show;
    },
  };

  registerRemoteRestRoutes(app, ctx);

  if (options.withSocketHandlers) {
    io.on('connection', (socket) => {
      registerRemoteHandlers(socket, ctx);
    });
  }

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const url = `http://127.0.0.1:${port}`;
  const remoteApiUrl = `${url}/api/v1/remote`;

  return {
    server,
    io,
    url,
    remoteApiUrl,
    ctx,
    outputManager,
    close: async () => {
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

export function saveApiTokenEnv(): { restore: () => void } {
  const original = process.env.SOFTDMX_API_TOKEN;
  return {
    restore() {
      if (original === undefined) {
        delete process.env.SOFTDMX_API_TOKEN;
      } else {
        process.env.SOFTDMX_API_TOKEN = original;
      }
    },
  };
}

export function clearApiTokenEnv(): { restore: () => void } {
  const tokenEnv = saveApiTokenEnv();
  delete process.env.SOFTDMX_API_TOKEN;
  return tokenEnv;
}
