/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFixtureYaml } from '../../src/fixture-library/fixture-yaml.ts';

function assertThrows(fn: () => unknown, messagePart: string): void {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, new RegExp(messagePart));
    return true;
  });
}

test('loadFixtureYaml parses a minimal valid fixture', () => {
  const fixture = loadFixtureYaml(`
id: valid-fixture
name: Valid Fixture
channels:
  - name: Dimmer
    type: intensity
    minValue: 0
    maxValue: 255
    defaultValue: 0
`);

  assert.equal(fixture.id, 'valid-fixture');
  assert.equal(fixture.channels.length, 1);
});

test('loadFixtureYaml rejects empty input', () => {
  assertThrows(() => loadFixtureYaml(''), 'fixture must be an object');
});

test('loadFixtureYaml rejects non-object roots', () => {
  assertThrows(() => loadFixtureYaml('just-a-string'), 'fixture must be an object');
});

test('loadFixtureYaml rejects missing channels', () => {
  assertThrows(
    () => loadFixtureYaml(`
id: no-channels
name: Missing Channels
`),
    'fixture.channels must be a non-empty array',
  );
});

test('loadFixtureYaml rejects invalid channel ranges', () => {
  assertThrows(
    () => loadFixtureYaml(`
id: bad-range
name: Bad Range
channels:
  - name: Dimmer
    type: intensity
    minValue: 200
    maxValue: 100
    defaultValue: 150
`),
    'maxValue must be >= minValue',
  );
});

test('loadFixtureYaml rejects missing fixture id', () => {
  assertThrows(
    () => loadFixtureYaml(`
name: Missing Id
channels:
  - name: Dimmer
    type: intensity
    minValue: 0
    maxValue: 255
    defaultValue: 0
`),
    'fixture.id must be a non-empty string',
  );
});
