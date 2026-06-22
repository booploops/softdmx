/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createEmptyShow } from '../src/show/document.ts';
import { mergeLayers, type LayerContribution } from '../src/engine/types.ts';
import { scratchToLayer } from '../src/engine/layers/scratch.ts';

const FIXTURE_COUNT = 100;
const ITERATIONS = 80;
const P95_BOUND_MS = 75;

console.log(`Running test: load merge tiers for ${FIXTURE_COUNT} fixtures`);

const show = createEmptyShow('Load Merge Tiers');
for (let index = 0; index < FIXTURE_COUNT; index += 1) {
  const fixtureName = `Wash ${index + 1}`;
  show.fixtures.push({ name: fixtureName, fixtureId: 'VRSL_Light5CH' });
}

show.groups.push({
  name: 'All Washes',
  fixtures: show.fixtures.map((fixture) => fixture.name),
});

const fixtureChannels = [
  { name: 'Dimmer', attributeType: 'intensity' },
  { name: 'Red', attributeType: 'color' },
  { name: 'Green', attributeType: 'color' },
  { name: 'Blue', attributeType: 'color' },
  { name: 'Strobe', attributeType: 'effect' },
];

const baseChannels = show.fixtures.flatMap((fixture, fixtureIndex) =>
  fixtureChannels.map((channel, channelIndex) => ({
    id: fixtureIndex * fixtureChannels.length + channelIndex + 1,
    path: `show://${fixture.name}/${channelIndex + 1}`,
    value: channel.attributeType === 'effect' ? 0 : 100,
    attributeType: channel.attributeType,
  }))
);
assert.equal(baseChannels.length, FIXTURE_COUNT * fixtureChannels.length);

const cueLayerChannels = new Map<string, LayerContribution['channels'] extends Map<string, infer V> ? V : never>();
for (let index = 0; index < baseChannels.length; index += 1) {
  const channel = baseChannels[index]!;
  cueLayerChannels.set(channel.path, {
    path: channel.path,
    value: (index * 11) % 256,
    attributeType: channel.attributeType ?? 'generic',
    priority: 40,
    source: 'cue',
  });
}

const cueLayer: LayerContribution = {
  source: 'cue',
  priority: 40,
  channels: cueLayerChannels,
};

const scratchLayer = scratchToLayer(baseChannels.slice(0, 40).map((channel, index) => ({
  path: channel.path,
  value: 255 - (index % 32),
  attributeType: channel.attributeType ?? 'generic',
  touchedAt: Date.now(),
})));

const iterationMs: number[] = [];

for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
  const effectChannels = new Map<string, LayerContribution['channels'] extends Map<string, infer V> ? V : never>();
  for (let fixtureIndex = 0; fixtureIndex < show.fixtures.length; fixtureIndex += 1) {
    const fixture = show.fixtures[fixtureIndex]!;
    const phase = ((iteration / ITERATIONS) + (fixtureIndex / show.fixtures.length)) % 1;
    const intensityValue = Math.round(64 + Math.sin(phase * Math.PI * 2) * 63);
    const dimmerPath = `show://${fixture.name}/1`;

    effectChannels.set(dimmerPath, {
      path: dimmerPath,
      value: intensityValue,
      attributeType: 'intensity',
      priority: 50,
      source: 'effect',
    });
  }

  const effectLayer: LayerContribution = {
    source: 'effect',
    priority: 50,
    channels: effectChannels,
  };

  const start = performance.now();
  const merged = mergeLayers(baseChannels, [cueLayer, effectLayer, scratchLayer], {
    grandMaster: 1,
    blackout: false,
  });
  iterationMs.push(performance.now() - start);
  assert.equal(merged.length, baseChannels.length);
}

iterationMs.sort((a, b) => a - b);
const p95Index = Math.min(iterationMs.length - 1, Math.ceil(iterationMs.length * 0.95) - 1);
const p95Ms = iterationMs[p95Index]!;

assert.ok(
  p95Ms < P95_BOUND_MS,
  `Expected p95 merge < ${P95_BOUND_MS}ms for ${FIXTURE_COUNT} fixtures, got ${p95Ms.toFixed(2)}ms`,
);

console.log(
  `Load merge tiers complete: p95=${p95Ms.toFixed(2)}ms over ${ITERATIONS} iterations (${FIXTURE_COUNT} fixtures).`,
);
