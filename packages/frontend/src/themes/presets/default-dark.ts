/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ThemeDefinition } from '../types.ts';
import { SHARED_TOKEN_DEFAULTS } from '../types.ts';

export const defaultDarkTheme: ThemeDefinition = {
  id: 'default-dark',
  name: 'Default Dark',
  description: 'SoftDMX signature dark console — refined neutrals with indigo accent',
  dark: true,
  tokens: {
    ...SHARED_TOKEN_DEFAULTS,
    colors: {
      bgPage: '#0e0e10',
      bgSurface: '#18181b',
      bgElevated: '#222226',
      bgToolbar: '#141416',
      bgDrawer: '#0a0a0c',
      border: 'rgba(255, 255, 255, 0.12)',
      borderSubtle: 'rgba(255, 255, 255, 0.07)',
      text: '#fafafa',
      textMuted: 'rgba(250, 250, 250, 0.72)',
      textFaint: 'rgba(250, 250, 250, 0.42)',
      primary: '#6366f1',
      secondary: '#22d3ee',
      accent: '#a78bfa',
      positive: '#22c55e',
      negative: '#ef4444',
      warning: '#f59e0b',
      info: '#38bdf8',
      overlay: 'rgba(0, 0, 0, 0.6)',
      selected: 'rgba(99, 102, 241, 0.2)',
      hover: 'rgba(255, 255, 255, 0.06)',
      scratch: '#f97316',
      gm: '#fb923c',
      active: '#22c55e',
      armed: '#f59e0b',
      flash: '#fde047',
      blind: '#a78bfa',
      focusRing: 'rgba(99, 102, 241, 0.55)',
      plotBackground: '#171717',
      plotFixture: '#38bdf8',
      plotSelected: '#6366f1',
      plotGrid: 'rgba(255, 255, 255, 0.08)',
      plotCenter: '#22c55e',
      plotLabel: 'rgba(250, 250, 250, 0.72)',
    },
  },
};
