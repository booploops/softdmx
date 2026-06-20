/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { io, type Socket } from 'socket.io-client';

const SOCKET_GLOBAL_KEY = '__softdmx_io_client__';
const DEFAULT_SOCKET_URL = 'http://127.0.0.1:5353';

function isElectronRenderer(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.electronAPI || window.electronGridNode || window.electronLink);
}

function resolveSocketUrl(): string | null {
  if (typeof window === 'undefined') {
    return DEFAULT_SOCKET_URL;
  }

  if (window.location.port === '5353') {
    return window.location.origin;
  }

  if (isElectronRenderer()) {
    return DEFAULT_SOCKET_URL;
  }

  // Browser-only Quasar dev (no Electron backend on 5353).
  return null;
}

function createClient(): Socket {
  const url = resolveSocketUrl();
  const socket = io(url ?? DEFAULT_SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: Boolean(url),
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  if (!url) {
    return socket;
  }

  let failedAttempts = 0;
  socket.on('connect_error', () => {
    failedAttempts += 1;
    if (failedAttempts >= 5) {
      socket.io.reconnection(false);
    }
  });

  socket.on('connect', () => {
    failedAttempts = 0;
  });

  socket.connect();
  return socket;
}

export function useIOClient(): Socket {
  const globalWindow = globalThis as typeof globalThis & {
    [SOCKET_GLOBAL_KEY]?: Socket;
  };

  if (!globalWindow[SOCKET_GLOBAL_KEY]) {
    globalWindow[SOCKET_GLOBAL_KEY] = createClient();
  }

  return globalWindow[SOCKET_GLOBAL_KEY];
}

/** @deprecated Prefer useIOClient() for HMR-safe singleton access. */
export const client = useIOClient();
