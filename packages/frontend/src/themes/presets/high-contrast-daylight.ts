/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ThemeDefinition } from '../types.ts';
import { SHARED_TOKEN_DEFAULTS } from '../types.ts';

export const highContrastDaylightTheme: ThemeDefinition = {
  id: 'high-contrast-daylight',
  name: 'High Contrast / Daylight',
  description: 'Maximum contrast for bright venues and outdoor use',
  dark: true,
  tokens: {
    ...SHARED_TOKEN_DEFAULTS,
    colors: {
      bgPage: '#000000',
      bgSurface: '#0a0a0a',
      bgElevated: '#141414',
      bgToolbar: '#000000',
      bgDrawer: '#000000',
      border: 'rgba(255, 255, 255, 0.28)',
      borderSubtle: 'rgba(255, 255, 255, 0.18)',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.88)',
      textFaint: 'rgba(255, 255, 255, 0.65)',
      primary: '#60a5fa',
      secondary: '#34d399',
      accent: '#c084fc',
      positive: '#4ade80',
      negative: '#f87171',
      warning: '#fbbf24',
      info: '#7dd3fc',
      overlay: 'rgba(0, 0, 0, 0.75)',
      selected: 'rgba(96, 165, 250, 0.35)',
      hover: 'rgba(255, 255, 255, 0.12)',
      scratch: '#fb923c',
      gm: '#fdba74',
      active: '#4ade80',
      armed: '#fbbf24',
      flash: '#fef08a',
      blind: '#c084fc',
      focusRing: 'rgba(96, 165, 250, 0.8)',
      plotBackground: '#050505',
      plotFixture: '#7dd3fc',
      plotSelected: '#60a5fa',
      plotGrid: 'rgba(255, 255, 255, 0.18)',
      plotCenter: '#4ade80',
      plotLabel: 'rgba(255, 255, 255, 0.88)',
    },
  },
};
