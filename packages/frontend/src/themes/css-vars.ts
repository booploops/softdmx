/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ThemeTokens } from '../types';

export function themeTokensToCssVars(tokens: ThemeTokens): Record<string, string> {
  const { colors, typography, radius, layout } = tokens;

  return {
    '--sdmx-color-bg-page': colors.bgPage,
    '--sdmx-color-bg-surface': colors.bgSurface,
    '--sdmx-color-bg-elevated': colors.bgElevated,
    '--sdmx-color-bg-toolbar': colors.bgToolbar,
    '--sdmx-color-bg-drawer': colors.bgDrawer,
    '--sdmx-color-border': colors.border,
    '--sdmx-color-border-subtle': colors.borderSubtle,
    '--sdmx-color-text': colors.text,
    '--sdmx-color-text-muted': colors.textMuted,
    '--sdmx-color-text-faint': colors.textFaint,
    '--sdmx-color-primary': colors.primary,
    '--sdmx-color-secondary': colors.secondary,
    '--sdmx-color-accent': colors.accent,
    '--sdmx-color-positive': colors.positive,
    '--sdmx-color-negative': colors.negative,
    '--sdmx-color-warning': colors.warning,
    '--sdmx-color-info': colors.info,
    '--sdmx-color-overlay': colors.overlay,
    '--sdmx-color-selected': colors.selected,
    '--sdmx-color-hover': colors.hover,
    '--sdmx-color-scratch': colors.scratch,
    '--sdmx-color-gm': colors.gm,
    '--sdmx-font-family': typography.fontFamily,
    '--sdmx-font-weight': typography.fontWeight,
    '--sdmx-radius-sm': radius.sm,
    '--sdmx-radius-md': radius.md,
    '--sdmx-radius-lg': radius.lg,
    '--sdmx-radius-button': radius.button,
    '--sdmx-layout-toolbar-height': layout.toolbarHeight,
    '--q-primary': colors.primary,
    '--q-secondary': colors.secondary,
    '--q-accent': colors.accent,
    '--q-positive': colors.positive,
    '--q-negative': colors.negative,
    '--q-warning': colors.warning,
    '--q-info': colors.info,
    '--q-dark': colors.bgSurface,
    '--q-dark-page': colors.bgPage,
  };
}

export const THEME_CSS_VAR_KEYS = [
  '--sdmx-color-bg-page',
  '--sdmx-color-bg-surface',
  '--sdmx-color-bg-elevated',
  '--sdmx-color-bg-toolbar',
  '--sdmx-color-bg-drawer',
  '--sdmx-color-bg-inset',
  '--sdmx-color-bg-muted',
  '--sdmx-color-border',
  '--sdmx-color-border-subtle',
  '--sdmx-color-border-faint',
  '--sdmx-color-border-strong',
  '--sdmx-color-text',
  '--sdmx-color-text-muted',
  '--sdmx-color-text-faint',
  '--sdmx-color-primary',
  '--sdmx-color-secondary',
  '--sdmx-color-accent',
  '--sdmx-color-positive',
  '--sdmx-color-negative',
  '--sdmx-color-warning',
  '--sdmx-color-info',
  '--sdmx-color-overlay',
  '--sdmx-color-selected',
  '--sdmx-color-hover',
  '--sdmx-color-scratch',
  '--sdmx-color-gm',
  '--sdmx-color-primary-soft',
  '--sdmx-color-primary-ring',
  '--sdmx-color-canvas-bg',
  '--sdmx-radius-sm',
  '--sdmx-radius-md',
  '--sdmx-radius-lg',
] as const;
