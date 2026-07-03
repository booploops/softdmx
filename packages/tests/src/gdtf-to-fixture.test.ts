/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { createSampleGdtfBytes } from './fixtures/sample-gdtf.ts';
import { loadFixtureFromGdtf, resolveFixtureChannelsForMode } from '../../frontend/src/fixture-library/gdtf/gdtf-to-fixture.ts';

const fixture = loadFixtureFromGdtf(createSampleGdtfBytes(), 'sample-wash.gdtf');

assert.equal(fixture.id, 'Sample_Wash');
assert.equal(fixture.name, 'Sample Wash');
assert.equal(fixture.source, 'gdtf');
assert.equal(fixture.channels.length, 6);
assert.equal(fixture.modes?.length, 2);
assert.equal(fixture.attributes?.length, 6);
assert.equal(fixture.defaultModeId, fixture.modes?.[0]?.id);

const compact = resolveFixtureChannelsForMode(fixture, fixture.modes?.[1]?.id);
assert.equal(compact.length, 3);

console.log('gdtf-to-fixture tests passed');
