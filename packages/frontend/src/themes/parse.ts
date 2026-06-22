/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ThemeDefinition } from './types.ts';

export function parseImportedTheme(raw: unknown): ThemeDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<ThemeDefinition>;
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return null;
  if (!candidate.tokens?.colors || !candidate.tokens.typography || !candidate.tokens.radius) return null;
  return {
    id: candidate.id,
    name: candidate.name,
    description: candidate.description,
    dark: candidate.dark !== false,
    tokens: candidate.tokens,
  };
}
