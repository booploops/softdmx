/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import fastify from 'fastify';
import { Server } from 'socket.io';
import type { ShowDocument } from '@softdmx/engine';
import { OutputManager } from '../output/output-manager';
import { ConfigFile } from './app-settings';
import {
  extractTokenFromSocketHandshake,
  getRequiredRemoteApiToken,
  isRemoteApiTokenAuthorized,
} from './auth/remote-token';

export interface RemoteContext {
  io: Server;
  outputManager: OutputManager;
  getShow: () => ShowDocument | null;
  setShow: (show: ShowDocument) => void;
  onMergeRequest?: () => void;
}

function getIOCors() {
  return {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-token'],
    credentials: true,
  };
}

export const httpServer = fastify();

export const io = new Server(httpServer.server, {
  cors: getIOCors(),
});

const requiredRemoteToken = getRequiredRemoteApiToken();
if (requiredRemoteToken) {
  io.use((socket, next) => {
    const token = extractTokenFromSocketHandshake(socket.handshake);
    if (!isRemoteApiTokenAuthorized(token, requiredRemoteToken)) {
      next(new Error('Unauthorized'));
      return;
    }
    next();
  });
}

export const config = new ConfigFile();
export const outputManager = new OutputManager(config);

let currentShow: ShowDocument | null = null;

export function getCurrentShow(): ShowDocument | null {
  return currentShow;
}

export function setCurrentShow(show: ShowDocument | null): void {
  currentShow = show;
}

export function createRemoteContext(): RemoteContext {
  return {
    io,
    outputManager,
    getShow: () => currentShow,
    setShow: (show: ShowDocument) => {
      currentShow = show;
    },
  };
}
