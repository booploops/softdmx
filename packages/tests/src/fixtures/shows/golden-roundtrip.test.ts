/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ShowDocumentVersion } from '../../../../frontend/src/show/document.ts';
import { CURRENT_SHOW_VERSION } from '../../../../frontend/src/show/version.ts';
import { readGoldenShow } from '../../helpers/show-builders.ts';

const GOLDEN_VERSIONS: ShowDocumentVersion[] = ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5'];

for (const version of GOLDEN_VERSIONS) {
  test(`golden ${version} migrates to ${CURRENT_SHOW_VERSION}`, () => {
    const doc = readGoldenShow(version);

    assert.equal(doc.version, CURRENT_SHOW_VERSION);
    assert.ok(doc.meta.name.startsWith('Golden'));
    assert.ok(Array.isArray(doc.fixtures));
    assert.ok(doc.desk?.views.length);
    assert.ok(doc.touch?.pages.length);
    assert.ok(doc.video);
    assert.ok(doc.backup);
    assert.ok(doc.presetPools?.length);
  });
}

test('golden 1.3 preserves legacy pixelMapId through migration', () => {
  const doc = readGoldenShow('1.3');
  assert.deepEqual(doc.video?.pixelMapIds, ['map-a']);
});
