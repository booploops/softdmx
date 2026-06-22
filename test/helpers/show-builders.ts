/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ShowDocument, ShowDocumentVersion } from '../../src/show/document.ts';
import { createEmptyShow } from '../../src/show/document.ts';
import { parseShowDocument } from '../../src/show/io.ts';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/shows');

/** Minimal valid 1.5 show with default desk, video, backup, and preset pool scaffolding. */
export function createMinimalShow(name = 'Test Show'): ShowDocument {
  return createEmptyShow(name);
}

/** Empty show with a single patched fixture. */
export function createShowWithFixture(
  fixtureName = 'Light 1',
  fixtureId = 'VRSL_Light5CH',
  showName = 'Fixture Show',
): ShowDocument {
  const show = createEmptyShow(showName);
  show.fixtures.push({ name: fixtureName, fixtureId });
  return show;
}

/** Load a versioned golden show fixture (migrated to current schema via parseShowDocument). */
export function readGoldenShow(version: ShowDocumentVersion): ShowDocument {
  const filename = `golden-${version}.yml`;
  const content = readFileSync(join(FIXTURES_DIR, filename), 'utf8');
  return parseShowDocument(content);
}
