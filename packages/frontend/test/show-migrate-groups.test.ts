/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { validateShowDocument } from '../src/show/io.ts';

console.log('Running test: legacy groups[].names migrates to fixtures');
const withGroupNames = validateShowDocument({
  version: '1.5',
  meta: { name: 'Legacy Groups', created: '2026-01-01T00:00:00.000Z', modified: '2026-01-01T00:00:00.000Z' },
  fixtures: [{ name: 'Light 1', fixtureId: 'VRSL_Light5CH' }],
  groups: [{ name: 'All', names: ['Light 1'] }],
  presets: [],
  cues: [],
});
assert.deepEqual(withGroupNames.groups[0]?.fixtures, ['Light 1']);

console.log('Running test: legacy linkedGroups migrates to groups');
const withLinkedGroups = validateShowDocument({
  version: '1.5',
  meta: { name: 'Legacy Linked', created: '2026-01-01T00:00:00.000Z', modified: '2026-01-01T00:00:00.000Z' },
  fixtures: [{ name: 'Light 2', fixtureId: 'VRSL_Light5CH' }],
  linkedGroups: [{ name: 'Wash', names: ['Light 2'] }],
  presets: [],
  cues: [],
});
assert.equal(withLinkedGroups.groups.length, 1);
assert.deepEqual(withLinkedGroups.groups[0]?.fixtures, ['Light 2']);

console.log('Running test: empty groups does not block linkedGroups migration');
const emptyGroupsWithLinked = validateShowDocument({
  version: '1.5',
  meta: { name: 'Empty Groups', created: '2026-01-01T00:00:00.000Z', modified: '2026-01-01T00:00:00.000Z' },
  fixtures: [{ name: 'Light 3', fixtureId: 'VRSL_Light5CH' }],
  groups: [],
  linkedGroups: [{ name: 'Linked', names: ['Light 3'] }],
  presets: [],
  cues: [],
});
assert.deepEqual(emptyGroupsWithLinked.groups[0]?.fixtures, ['Light 3']);

console.log('All show migrate group tests passed!');
