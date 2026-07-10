/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

function parseCssColor(color: string): { r: number; g: number; b: number } | null {
  const value = color.trim();
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    if (full.length < 6) return null;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }
  const match = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  };
}

/** Background + readable label color for a swatch (hex/rgb). CSS vars are left as-is. */
export function contrastingSurfaceStyle(backgroundColor?: string): Record<string, string> {
  if (!backgroundColor) return {};
  const rgb = parseCssColor(backgroundColor);
  if (!rgb) return { backgroundColor };
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return {
    backgroundColor,
    color: luminance > 0.55 ? '#1d1d1f' : '#ffffff',
  };
}

/** Inline styles for a colored preset button with readable label contrast. */
export function presetButtonStyle(color?: string): Record<string, string> {
  return contrastingSurfaceStyle(color);
}
