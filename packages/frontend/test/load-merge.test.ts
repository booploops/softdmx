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

console.log('Running test: load merge matrix for 50 fixtures');

const show = createEmptyShow('Load Matrix');
for (let index = 0; index < 50; index += 1) {
  const fixtureName = `Wash ${index + 1}`;
  show.fixtures.push({ name: fixtureName, fixtureId: 'VRSL_Light5CH' });
}

show.groups.push({
  name: 'All Washes',
  fixtures: show.fixtures.map((fixture) => fixture.name),
});

show.effects.push({
  id: 'sine-dimmer',
  name: 'Dimmer Sine',
  type: 'sine',
  enabled: true,
  rate: 1.5,
  depth: 90,
  offset: 128,
  target: {
    group: 'All Washes',
    attr: 'Dimmer',
  },
  sync: 'free',
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
assert.equal(baseChannels.length, 250);

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

const scratchLayer = scratchToLayer(baseChannels.slice(0, 20).map((channel, index) => ({
  path: channel.path,
  value: 255 - (index % 32),
  attributeType: channel.attributeType ?? 'generic',
  touchedAt: Date.now(),
})));

const iterations = 120;
const start = performance.now();

let lastMerged = baseChannels;
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const effectChannels = new Map<string, LayerContribution['channels'] extends Map<string, infer V> ? V : never>();
  for (let fixtureIndex = 0; fixtureIndex < show.fixtures.length; fixtureIndex += 1) {
    const fixture = show.fixtures[fixtureIndex]!;
    const phase = ((iteration / iterations) + (fixtureIndex / show.fixtures.length)) % 1;
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

  lastMerged = mergeLayers(baseChannels, [cueLayer, effectLayer, scratchLayer], {
    grandMaster: 1,
    blackout: false,
  });
}

const elapsedMs = performance.now() - start;

assert.equal(lastMerged.length, baseChannels.length);
assert.ok(elapsedMs < 1200, `Expected merge benchmark < 1200ms, got ${elapsedMs.toFixed(2)}ms`);

console.log(`Load merge benchmark complete: ${elapsedMs.toFixed(2)}ms for ${iterations} iterations.`);
