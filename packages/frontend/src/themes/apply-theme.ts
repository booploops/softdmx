/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Dark } from 'quasar';
import type { ThemeDefinition } from './types.ts';
import { themeTokensToCssVars } from './css-vars.ts';

const CUSTOM_CSS_STYLE_ID = 'softdmx-theme-custom-css';

export function applyThemeDefinition(theme: ThemeDefinition, customCss = ''): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.dataset.themeMode = theme.dark ? 'dark' : 'light';

  const cssVars = themeTokensToCssVars(theme.tokens);
  for (const [key, value] of Object.entries(cssVars)) {
    root.style.setProperty(key, value);
  }

  Dark.set(theme.dark);

  let styleEl = document.getElementById(CUSTOM_CSS_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = CUSTOM_CSS_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = customCss.trim();
}
