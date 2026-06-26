/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { deepMerge } from '../../frontend/src/themes/merge.ts';
import { themeTokensToCssVars } from '../../frontend/src/themes/css-vars.ts';
import { defaultDarkTheme } from '../../frontend/src/themes/presets/default-dark.ts';
import { parseImportedTheme } from '../../frontend/src/themes/parse.ts';

console.log('Running test: deepMerge theme tokens');
const merged = deepMerge(defaultDarkTheme.tokens, {
  colors: { primary: '#ff00aa' },
});
assert.equal(merged.colors.primary, '#ff00aa');
assert.equal(merged.colors.bgPage, defaultDarkTheme.tokens.colors.bgPage);

console.log('Running test: themeTokensToCssVars');
const vars = themeTokensToCssVars(defaultDarkTheme.tokens);
assert.equal(vars['--sdmx-color-primary'], '#1976d2');
assert.equal(vars['--q-primary'], '#1976d2');

console.log('Running test: parseImportedTheme');
const imported = parseImportedTheme(defaultDarkTheme);
assert.ok(imported);
assert.equal(imported.id, 'default-dark');

console.log('All theme tests passed.');
