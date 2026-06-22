/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ThemeDefinition } from '../types.ts';
import { defaultDarkTheme } from './default-dark';

export const studioBlueTheme: ThemeDefinition = {
  ...defaultDarkTheme,
  id: 'studio-blue',
  name: 'Studio Blue',
  description: 'Cool console blues with tighter contrast',
  tokens: {
    ...defaultDarkTheme.tokens,
    colors: {
      ...defaultDarkTheme.tokens.colors,
      bgPage: '#0b1220',
      bgSurface: '#111b2e',
      bgElevated: '#16233a',
      bgToolbar: '#0f1929',
      bgDrawer: '#0a111d',
      primary: '#3b82f6',
      secondary: '#22d3ee',
      accent: '#818cf8',
      selected: 'rgba(59, 130, 246, 0.22)',
      scratch: '#2563eb',
      gm: '#38bdf8',
    },
  },
};
