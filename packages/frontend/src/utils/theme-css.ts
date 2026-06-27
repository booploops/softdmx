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
    background: readThemeCssVar('--sdmx-color-plot-bg', readThemeCssVar('--sdmx-color-canvas-bg', '#171717')),
    grid: readThemeCssVar('--sdmx-color-plot-grid', readThemeCssVar('--sdmx-color-canvas-grid', 'rgba(255,255,255,0.08)')),
    center: readThemeCssVar('--sdmx-color-plot-center', readThemeCssVar('--sdmx-color-positive', '#66bb6a')),
    fixture: readThemeCssVar('--sdmx-color-plot-fixture', readThemeCssVar('--sdmx-color-info', '#42a5f5')),
    selected: readThemeCssVar('--sdmx-color-plot-selected', readThemeCssVar('--sdmx-color-primary', '#7aa2ff')),
    label: readThemeCssVar('--sdmx-color-plot-label', readThemeCssVar('--sdmx-color-text-muted', '#e8e8e8')),
    empty: readThemeCssVar('--sdmx-color-text-faint', '#909090'),
  };
}
