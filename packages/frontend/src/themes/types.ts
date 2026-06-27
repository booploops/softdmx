/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type ThemeColorTokens = {
  bgPage: string;
  bgSurface: string;
  bgElevated: string;
  bgToolbar: string;
  bgDrawer: string;
  border: string;
  borderSubtle: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  secondary: string;
  accent: string;
  positive: string;
  negative: string;
  warning: string;
  info: string;
  overlay: string;
  selected: string;
  hover: string;
  scratch: string;
  gm: string;
  /** Fixture/output actively playing */
  active: string;
  /** Cue or preset armed, awaiting Go */
  armed: string;
  /** Flash/momentary state */
  flash: string;
  /** Blind/preview mode indicator */
  blind: string;
  /** Keyboard/focus ring */
  focusRing: string;
  /** Plot/visualizer background */
  plotBackground: string;
  /** Plot/visualizer fixture color */
  plotFixture: string;
  /** Plot/visualizer selected fixture color */
  plotSelected: string;
  /** Plot/visualizer grid line color */
  plotGrid: string;
  /** Plot/visualizer stage center marker color */
  plotCenter: string;
  /** Plot/visualizer label color */
  plotLabel: string;
};

export type ThemeTypographyTokens = {
  fontFamily: string;
  fontFamilyMono: string;
  fontWeight: string;
  fontWeightBold: string;
  fontSizeDisplay: string;
  fontSizeTitle: string;
  fontSizeBody: string;
  fontSizeLabel: string;
  fontSizeCaption: string;
  fontSizeMono: string;
  lineHeightTight: string;
  lineHeightNormal: string;
};

export type ThemeSpacingTokens = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  touchTarget: string;
};

export type ThemeElevationTokens = {
  none: string;
  sm: string;
  md: string;
  lg: string;
  inset: string;
};

export type ThemeRadiusTokens = {
  sm: string;
  md: string;
  lg: string;
  button: string;
  full: string;
};

export type ThemeLayoutTokens = {
  toolbarHeight: string;
  masterBarHeight: string;
  windowHeaderHeight: string;
  playbackRailMinHeight: string;
};

export type ThemeMotionTokens = {
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
  easingDefault: string;
};

export type ThemeTokens = {
  colors: ThemeColorTokens;
  typography: ThemeTypographyTokens;
  spacing: ThemeSpacingTokens;
  elevation: ThemeElevationTokens;
  radius: ThemeRadiusTokens;
  layout: ThemeLayoutTokens;
  motion: ThemeMotionTokens;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  description?: string;
  dark: boolean;
  tokens: ThemeTokens;
};

export type ThemeOverrides = {
  tokens?: DeepPartial<ThemeTokens>;
  customCss?: string;
};

export type ThemePersistedState = {
  activeThemeId: string;
  overrides: ThemeOverrides;
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type { DeepPartial };

/** Shared token defaults used as base for all presets */
export const SHARED_TOKEN_DEFAULTS: Omit<ThemeTokens, 'colors'> & { colors?: never } = {
  typography: {
    fontFamily: '"Roboto Flex Variable", system-ui, sans-serif',
    fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontWeight: '500',
    fontWeightBold: '700',
    fontSizeDisplay: '20px',
    fontSizeTitle: '16px',
    fontSizeBody: '14px',
    fontSizeLabel: '12px',
    fontSizeCaption: '11px',
    fontSizeMono: '13px',
    lineHeightTight: '1.2',
    lineHeightNormal: '1.5',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
    touchTarget: '44px',
  },
  elevation: {
    none: 'none',
    sm: '0 1px 3px var(--sdmx-color-shadow, rgba(0,0,0,0.3))',
    md: '0 4px 12px var(--sdmx-color-shadow, rgba(0,0,0,0.35))',
    lg: '0 8px 24px var(--sdmx-color-shadow-strong, rgba(0,0,0,0.4))',
    inset: 'inset 0 1px 2px rgba(0,0,0,0.2)',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '12px',
    button: '8px',
    full: '9999px',
  },
  layout: {
    toolbarHeight: '48px',
    masterBarHeight: '52px',
    windowHeaderHeight: '32px',
    playbackRailMinHeight: '140px',
  },
  motion: {
    durationFast: '80ms',
    durationNormal: '150ms',
    durationSlow: '250ms',
    easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};
