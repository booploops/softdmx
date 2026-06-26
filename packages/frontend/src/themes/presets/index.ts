/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ThemeDefinition } from '../types.ts';
import { defaultDarkTheme } from './default-dark';
import { defaultLightTheme } from './default-light';
import { highContrastDaylightTheme } from './high-contrast-daylight';
import { studioBlueTheme } from './studio-blue';

export const builtinThemes: ThemeDefinition[] = [
  defaultDarkTheme,
  defaultLightTheme,
  highContrastDaylightTheme,
  studioBlueTheme,
];

export const builtinThemeMap = new Map(builtinThemes.map((theme) => [theme.id, theme]));

export function getBuiltinTheme(id: string): ThemeDefinition | undefined {
  return builtinThemeMap.get(id);
}

export { defaultDarkTheme, defaultLightTheme, highContrastDaylightTheme, studioBlueTheme };
