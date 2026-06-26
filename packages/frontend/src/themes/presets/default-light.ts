/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ThemeDefinition } from '../types.ts';
import { SHARED_TOKEN_DEFAULTS } from '../types.ts';

export const defaultLightTheme: ThemeDefinition = {
  id: 'default-light',
  name: 'Default Light',
  description: 'Clean light theme for programming and setup sessions',
  dark: false,
  tokens: {
    ...SHARED_TOKEN_DEFAULTS,
    colors: {
      bgPage: '#f4f4f5',
      bgSurface: '#ffffff',
      bgElevated: '#fafafa',
      bgToolbar: '#ffffff',
      bgDrawer: '#ececee',
      border: 'rgba(0, 0, 0, 0.12)',
      borderSubtle: 'rgba(0, 0, 0, 0.07)',
      text: '#18181b',
      textMuted: 'rgba(24, 24, 27, 0.72)',
      textFaint: 'rgba(24, 24, 27, 0.45)',
      primary: '#4f46e5',
      secondary: '#0891b2',
      accent: '#7c3aed',
      positive: '#16a34a',
      negative: '#dc2626',
      warning: '#d97706',
      info: '#0284c7',
      overlay: 'rgba(0, 0, 0, 0.35)',
      selected: 'rgba(79, 70, 229, 0.12)',
      hover: 'rgba(0, 0, 0, 0.04)',
      scratch: '#ea580c',
      gm: '#f97316',
      active: '#16a34a',
      armed: '#d97706',
      flash: '#ca8a04',
      blind: '#7c3aed',
      focusRing: 'rgba(79, 70, 229, 0.45)',
    },
  },
};
