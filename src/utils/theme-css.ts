/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function readThemeCssVar(name: string, fallback = ''): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function readThemeCanvasPalette() {
  return {
    background: readThemeCssVar('--sdmx-color-canvas-bg', '#171717'),
    grid: readThemeCssVar('--sdmx-color-canvas-grid', 'rgba(255,255,255,0.08)'),
    center: readThemeCssVar('--sdmx-color-positive', '#66bb6a'),
    fixture: readThemeCssVar('--sdmx-color-info', '#42a5f5'),
    label: readThemeCssVar('--sdmx-color-text-muted', '#e8e8e8'),
    empty: readThemeCssVar('--sdmx-color-text-faint', '#909090'),
  };
}
