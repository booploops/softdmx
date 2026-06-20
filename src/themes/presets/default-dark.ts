/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ThemeDefinition } from '../types';

export const defaultDarkTheme: ThemeDefinition = {
  id: 'default-dark',
  name: 'Default Dark',
  description: 'SoftDMX factory dark theme',
  dark: true,
  tokens: {
    colors: {
      bgPage: '#121212',
      bgSurface: '#1d1d1d',
      bgElevated: '#242424',
      bgToolbar: '#1d1d1d',
      bgDrawer: '#161616',
      border: 'rgba(255, 255, 255, 0.12)',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.7)',
      textFaint: 'rgba(255, 255, 255, 0.45)',
      primary: '#1976d2',
      secondary: '#26a69a',
      accent: '#9c27b0',
      positive: '#21ba45',
      negative: '#c10015',
      warning: '#f2c037',
      info: '#31ccec',
      overlay: 'rgba(0, 0, 0, 0.55)',
      selected: 'rgba(25, 118, 210, 0.18)',
      hover: 'rgba(255, 255, 255, 0.08)',
      scratch: '#e65100',
      gm: '#ff9800',
    },
    typography: {
      fontFamily: '"Roboto Flex Variable", sans-serif',
      fontWeight: '500',
    },
    radius: {
      sm: '6px',
      md: '10px',
      lg: '12px',
      button: '30px',
    },
    layout: {
      toolbarHeight: '48px',
    },
  },
};
