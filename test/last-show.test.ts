/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { createEmptyShow } from '../src/show/document.ts';
import { formatLastShowSavedAt, readLastShow, writeLastShow } from '../src/utils/last-show.ts';

console.log('Running test: last show round-trip');

const storage = new Map<string, string>();
globalThis.window = {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  },
} as unknown as Window & typeof globalThis;

const show = createEmptyShow('Saved Session');
show.fixtures.push({ name: 'Light 1', fixtureId: 'VRSL_Light5CH' });

writeLastShow({
  document: show,
  scratch: [],
  filePath: 'my-show.yml',
});

const restored = readLastShow();
assert.ok(restored);
assert.equal(restored?.document.meta.name, 'Saved Session');
assert.equal(restored?.filePath, 'my-show.yml');
assert.equal(restored?.document.fixtures.length, 1);

console.log('Running test: format last show saved at');
assert.match(formatLastShowSavedAt('2026-01-01T12:00:00.000Z'), /\d/);

console.log('All last show tests passed!');
