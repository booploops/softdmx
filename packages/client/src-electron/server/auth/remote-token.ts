/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function getRequiredRemoteApiToken(): string | null {
  const token = process.env.SOFTDMX_API_TOKEN?.trim();
  return token && token.length > 0 ? token : null;
}

export function extractBearerOrHeaderToken(
  authorization: unknown,
  apiTokenHeader: unknown,
): string | null {
  const bearerHeader = typeof authorization === 'string' ? authorization.trim() : '';
  if (bearerHeader.length > 0) {
    if (bearerHeader.toLowerCase().startsWith('bearer ')) {
      return bearerHeader.slice(7).trim();
    }
    return bearerHeader;
  }

  if (typeof apiTokenHeader === 'string' && apiTokenHeader.trim().length > 0) {
    return apiTokenHeader.trim();
  }

  return null;
}

export function extractTokenFromHeaders(headers: Record<string, unknown>): string | null {
  return extractBearerOrHeaderToken(headers.authorization, headers['x-api-token']);
}

export function extractTokenFromSocketHandshake(handshake: {
  auth?: unknown;
  headers?: Record<string, unknown>;
}): string | null {
  const auth = handshake.auth;
  if (auth && typeof auth === 'object') {
    const token = (auth as { token?: unknown }).token;
    if (typeof token === 'string' && token.trim().length > 0) {
      return token.trim();
    }
  }

  const headers = handshake.headers ?? {};
  return extractBearerOrHeaderToken(headers.authorization, headers['x-api-token']);
}

export function isRemoteApiTokenAuthorized(
  providedToken: string | null | undefined,
  requiredToken: string | null = getRequiredRemoteApiToken(),
): boolean {
  if (!requiredToken) {
    return true;
  }
  return Boolean(providedToken && providedToken === requiredToken);
}
