/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearPluginRegistry,
  getAllFixtures,
  getFixtureDefinition,
  getPlugin,
  initPluginRegistry,
  registerRuntimeFixtureFromYaml,
} from '../../src/fixture-library/registry.ts';

const minimalFixtureYaml = (id: string, name: string) => `
id: ${id}
name: ${name}
channels:
  - name: Dimmer
    type: intensity
    minValue: 0
    maxValue: 255
    defaultValue: 0
`;

test('getFixtureDefinition resolves builtin fixtures after init', () => {
  clearPluginRegistry();
  initPluginRegistry();

  const fixture = getFixtureDefinition('VRSL_Light5CH');
  assert.ok(fixture);
  assert.equal(fixture.id, 'VRSL_Light5CH');
  assert.ok(getPlugin('builtin'));
});

test('getFixtureDefinition returns undefined for unknown ids', () => {
  clearPluginRegistry();
  initPluginRegistry();

  assert.equal(getFixtureDefinition('does-not-exist'), undefined);
});

test('registerRuntimeFixtureFromYaml replaces duplicate fixture ids', () => {
  clearPluginRegistry();
  initPluginRegistry();

  registerRuntimeFixtureFromYaml(minimalFixtureYaml('runtime-dup', 'Original'));
  registerRuntimeFixtureFromYaml(minimalFixtureYaml('runtime-dup', 'Updated'));

  const fixture = getFixtureDefinition('runtime-dup');
  assert.ok(fixture);
  assert.equal(fixture.name, 'Updated');
  assert.equal(getAllFixtures().filter((entry) => entry.id === 'runtime-dup').length, 1);
});
