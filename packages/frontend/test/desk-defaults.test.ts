/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  createDefaultDeskConfig,
  validateDeskView,
  DEFAULT_DESK_VIEWS,
  buildDeskRowBands,
  deskPaneGridPlacement,
} from '../src/utils/desk-defaults.ts';
import { migrateShowDocument } from '../src/show/migrate.ts';
import { createEmptyShow } from '../src/show/document.ts';

console.log('Running test: desk-defaults views are valid');
for (const view of DEFAULT_DESK_VIEWS) {
  assert.equal(validateDeskView(view), true, `invalid view ${view.id}`);
}

console.log('Running test: createDefaultDeskConfig');
const desk = createDefaultDeskConfig();
assert.equal(desk.defaultViewId, 'busking');
assert.ok(desk.views.length >= 4);

console.log('Running test: migrate 1.1 to 1.5');
const v11 = { ...createEmptyShow('Migrate'), version: '1.1' as const };
delete v11.desk;
delete v11.touch;
const migrated = migrateShowDocument(v11);
assert.equal(migrated.version, '1.5');
assert.ok(migrated.desk?.views.length);
assert.ok(migrated.touch?.pages.length);

console.log('Running test: busking desk row bands');
const busking = DEFAULT_DESK_VIEWS.find((view) => view.id === 'busking')!;
const buskingBands = buildDeskRowBands(busking.panes);
assert.deepEqual(
  buskingBands.map((band) => band.height),
  [7, 5]
);
const fixturePlacement = deskPaneGridPlacement(busking.panes[0]!, buskingBands);
const programmerPlacement = deskPaneGridPlacement(busking.panes[2]!, buskingBands);
assert.equal(fixturePlacement.row, '1 / span 1');
assert.equal(programmerPlacement.row, '2 / span 1');
assert.equal(fixturePlacement.column, '1 / span 8');
assert.equal(programmerPlacement.column, '1 / span 12');

console.log('desk-defaults tests passed');
