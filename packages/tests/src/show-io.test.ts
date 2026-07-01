/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { mergeLayers } from '../../frontend/src/engine/types.ts';
import { scratchToLayer } from '../../frontend/src/engine/layers/scratch.ts';
import { parseShowDocument, serializeShowDocument } from '../../frontend/src/show/io.ts';
import { createEmptyShow } from '../../frontend/src/show/document.ts';

console.log('Running test: show-io round-trip');
const show = createEmptyShow('Test');
show.fixtures.push({ name: 'Light 1', fixtureId: 'VRSL_Light5CH' });
show.groups.push({ name: 'All', fixtures: ['Light 1'], color: '#1e88e5' });
show.presets.push({
  id: 'p1',
  name: 'Red',
  targets: [{ fixtures: ['Light 1'], attrs: { Red: 255 } }],
});

const yaml = serializeShowDocument(show);
const parsed = parseShowDocument(yaml);
assert.equal(parsed.meta.name, 'Test');
assert.equal(parsed.fixtures.length, 1);
assert.equal(parsed.presets.length, 1);
assert.equal(parsed.groups[0]?.color, '#1e88e5');
assert.equal(parsed.version, '1.6');
assert.ok(parsed.presetPools?.length);
assert.ok(parsed.backup);
assert.ok(parsed.video);
assert.ok(parsed.desk?.views.length);
assert.ok(parsed.touch?.pages.length);
assert.deepEqual(parsed.plugins, ['builtin']);
assert.deepEqual(parsed.audioMappings, []);
assert.ok(Array.isArray(parsed.executors));
assert.ok(Array.isArray(parsed.submasters));
assert.ok(Array.isArray(parsed.pixelMaps));

console.log('Running test: merge scratch over base');
const base = [{ id: 1, path: 'show://Light 1/2', value: 0, attributeType: 'color' }];
const merged = mergeLayers(base, [{
  source: 'scratch',
  priority: 100,
  channels: new Map([['show://Light 1/2', {
    path: 'show://Light 1/2',
    value: 200,
    attributeType: 'color',
    priority: 100,
    source: 'scratch',
  }]]),
}], { grandMaster: 1, blackout: false });
assert.equal(merged[0]!.value, 200);

console.log('Running test: scratch lowers HTP channels');
const baseDimmer = [{ id: 1, path: 'show://Light 1/1', value: 255, attributeType: 'intensity' }];
const mergedDimmer = mergeLayers(baseDimmer, [{
  source: 'scratch',
  priority: 100,
  channels: new Map([['show://Light 1/1', {
    path: 'show://Light 1/1',
    value: 80,
    attributeType: 'intensity',
    priority: 100,
    source: 'scratch',
  }]]),
}], { grandMaster: 1, blackout: false });
assert.equal(mergedDimmer[0]!.value, 80);

console.log('Running test: grand master scales intensity but not position');
const baseMixed = [
  { id: 1, path: 'show://Light 1/1', value: 255, attributeType: 'intensity' },
  { id: 2, path: 'show://Light 1/2', value: 200, attributeType: 'position' },
];
const mergedMixed = mergeLayers(baseMixed, [], { grandMaster: 0.5, blackout: false });
assert.equal(mergedMixed.find((ch) => ch.path === 'show://Light 1/1')?.value, 128);
assert.equal(mergedMixed.find((ch) => ch.path === 'show://Light 1/2')?.value, 200);

console.log('Running test: blackout');
const blacked = mergeLayers(base, [], { grandMaster: 1, blackout: true });
assert.equal(blacked[0]!.value, 0);

console.log('Running test: load show + scratch merge integration');
const integrationShow = createEmptyShow('Integration');
integrationShow.fixtures.push({ name: 'Spot 1', fixtureId: 'VRSL_Light5CH' });
const loadedShow = parseShowDocument(serializeShowDocument(integrationShow));
const baseChannels = [{
  id: 1,
  path: `show://${loadedShow.fixtures[0]!.name}/1`,
  value: 0,
  attributeType: 'intensity',
}];
const scratched = scratchToLayer([{
  path: 'show://Spot 1/1',
  value: 77,
  attributeType: 'intensity',
  touchedAt: Date.now(),
}]);
const mergedIntegration = mergeLayers(baseChannels, [scratched], { grandMaster: 1, blackout: false });
const dimmer = mergedIntegration.find((ch) => ch.path === 'show://Spot 1/1');
assert.equal(dimmer?.value, 77);

console.log('Running test: migrate v1.0 document to v1.5 defaults');
const legacyV10Yaml = `
version: "1.0"
meta:
  name: Legacy Show
  created: "2026-01-01T00:00:00.000Z"
  modified: "2026-01-01T00:00:00.000Z"
fixtures:
  - name: Spot 1
    fixtureId: VRSL_Light5CH
groups: []
presets: []
effects: []
cues: []
bindings:
  midi: []
  osc: []
`;
const migrated = parseShowDocument(legacyV10Yaml);
assert.equal(migrated.version, '1.6');
assert.equal(migrated.video?.enabled, false);
assert.ok(migrated.desk?.views.length);
assert.ok(migrated.touch?.pages.length);
assert.deepEqual(migrated.audioMappings, []);
assert.deepEqual(migrated.executors, []);
assert.deepEqual(migrated.submasters, []);
assert.deepEqual(migrated.pixelMaps, []);
assert.deepEqual(migrated.plugins, ['builtin']);
assert.equal(migrated.destinations.length, 1);

console.log('Running test: preserve v1.1 advanced fields through v1.5 normalization');
const v11Yaml = `
version: "1.1"
meta:
  name: Advanced Show
  created: "2026-01-01T00:00:00.000Z"
  modified: "2026-01-01T00:00:00.000Z"
plugins:
  - builtin
destinations:
  - id: default-gridnode
    name: Default GridNode Overlay
    type: gridnode
    settings: {}
fixtures: []
groups: []
presets: []
effects: []
cues: []
bindings:
  midi: []
  osc: []
audio:
  enabled: true
  bpm: 128
audioMappings:
  - id: map-1
    source: rms
    targetType: fixture
    targetId: Spot 1
    attribute: Dimmer
executors:
  - id: exec-1
    name: Main
    pages: 1
    activePage: 1
    slots:
      - id: slot-1
        name: Slot 1
        page: 1
        index: 0
        mode: go
submasters:
  - id: sub-1
    name: Front Wash
    value: 0.8
pixelMaps:
  - id: map-a
    name: Wall
    width: 4
    height: 2
    channelOrder: rgb
    fixtureChannels:
      - fixtureName: Spot 1
        x: 1
        y: 0
        startChannel: 1
`;
const advanced = parseShowDocument(v11Yaml);
assert.equal(advanced.version, '1.6');
assert.equal(advanced.audio?.bpm, 128);
assert.equal(advanced.audioMappings?.length, 1);
assert.equal(advanced.executors?.[0]?.id, 'exec-1');
assert.equal(advanced.submasters?.[0]?.id, 'sub-1');
assert.equal(advanced.pixelMaps?.[0]?.id, 'map-a');
assert.equal(advanced.pixelMaps?.[0]?.fixtureChannels?.[0]?.startChannel, 1);

console.log('All core architecture tests passed!');
