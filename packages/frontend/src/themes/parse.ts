/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ThemeDefinition } from './types.ts';
import { SHARED_TOKEN_DEFAULTS } from './types.ts';
import { defaultDarkTheme } from './presets/default-dark';

export function parseImportedTheme(raw: unknown): ThemeDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<ThemeDefinition>;
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return null;
  if (!candidate.tokens?.colors) return null;

  const tokens = candidate.tokens;
  return {
    id: candidate.id,
    name: candidate.name,
    description: candidate.description,
    dark: candidate.dark !== false,
    tokens: {
      colors: { ...defaultDarkTheme.tokens.colors, ...tokens.colors },
      typography: { ...SHARED_TOKEN_DEFAULTS.typography, ...tokens.typography },
      spacing: { ...SHARED_TOKEN_DEFAULTS.spacing, ...tokens.spacing },
      elevation: { ...SHARED_TOKEN_DEFAULTS.elevation, ...tokens.elevation },
      radius: { ...SHARED_TOKEN_DEFAULTS.radius, ...tokens.radius },
      layout: { ...SHARED_TOKEN_DEFAULTS.layout, ...tokens.layout },
      motion: { ...SHARED_TOKEN_DEFAULTS.motion, ...tokens.motion },
    },
  };
}
