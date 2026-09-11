/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getDevUrl, isDev } from "../../runtime/env";
import { AppState } from "../../state/main";
import { config } from "../../state/config";

export function isRemoteListenEnabled(): boolean {
  return config.configFile().remote.listenRemote === true;
}

export function getListenHost(): string {
  return isRemoteListenEnabled() ? "0.0.0.0" : "127.0.0.1";
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (isRemoteListenEnabled()) return true;

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;
    if (host === "127.0.0.1" || host === "localhost") return true;
  } catch {
    return false;
  }

  if (isDev()) {
    try {
      return new URL(origin).origin === new URL(getDevUrl()).origin;
    } catch {
      return origin === getDevUrl();
    }
  }

  return origin === `http://127.0.0.1:${AppState.port}` || origin === `http://localhost:${AppState.port}`;
}

export function getSocketCors() {
  return {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-token"],
    credentials: true,
  };
}
