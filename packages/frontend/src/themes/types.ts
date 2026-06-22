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
};

export type ThemeTypographyTokens = {
  fontFamily: string;
  fontWeight: string;
};

export type ThemeRadiusTokens = {
  sm: string;
  md: string;
  lg: string;
  button: string;
};

export type ThemeLayoutTokens = {
  toolbarHeight: string;
};

export type ThemeTokens = {
  colors: ThemeColorTokens;
  typography: ThemeTypographyTokens;
  radius: ThemeRadiusTokens;
  layout: ThemeLayoutTokens;
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
