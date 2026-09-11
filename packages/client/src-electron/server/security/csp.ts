/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { getDevUrl, isDev } from "../../runtime/env";
import { AppState } from "../../state/main";

export function buildContentSecurityPolicy(): string {
  const port = AppState.port;
  const connect = [
    "'self'",
    "ws:",
    "wss:",
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    `ws://127.0.0.1:${port}`,
    `ws://localhost:${port}`,
  ];

  if (isDev()) {
    const devUrl = getDevUrl();
    connect.push(devUrl);
    try {
      const parsed = new URL(devUrl);
      connect.push(`ws://${parsed.host}`, `http://${parsed.host}`);
    } catch {
      // keep the raw APP_URL entry
    }
  }

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `connect-src ${connect.join(" ")}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
