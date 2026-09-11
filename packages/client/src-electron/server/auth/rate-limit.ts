/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const REMOTE_RATE_LIMIT_WINDOW_MS = 60_000;
export const REMOTE_RATE_LIMIT_MAX_REQUESTS = 240;

const clientRequests = new Map<string, { count: number; resetAt: number }>();

function cleanRateLimitCache() {
  const now = Date.now();
  for (const [key, record] of clientRequests.entries()) {
    if (now > record.resetAt) {
      clientRequests.delete(key);
    }
  }
}

setInterval(cleanRateLimitCache, 60_000).unref?.();

export function consumeRateLimit(
  clientKey: string,
  maxRequests = REMOTE_RATE_LIMIT_MAX_REQUESTS,
  windowMs = REMOTE_RATE_LIMIT_WINDOW_MS,
): { allowed: boolean; resetAt: number; count: number } {
  const now = Date.now();
  let record = clientRequests.get(clientKey);

  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
    clientRequests.set(clientKey, record);
  }

  record.count += 1;
  return {
    allowed: record.count <= maxRequests,
    resetAt: record.resetAt,
    count: record.count,
  };
}
