/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import assert from 'node:assert/strict';
import {
  createAudioMappingEvalState,
  evaluateAudioMappings,
} from '../src/engine/audio-mapping.ts';
import { createEmptyShow } from '../src/types/show-document.ts';

console.log('Running test: fixture RMS mapping');
const fixtureShow = createEmptyShow('Audio Fixture Mapping');
fixtureShow.fixtures.push({ name: 'Kick 1', fixtureId: 'VRSL_Light5CH' });
fixtureShow.audioMappings = [
  {
    id: 'map-rms',
    source: 'rms',
    targetType: 'fixture',
    targetId: 'Kick 1',
    attribute: 'Dimmer',
    enabled: true,
    gain: 1,
    offset: 0,
    min: 0,
    max: 255,
    attackMs: 0,
    releaseMs: 0,
  },
];

const fixtureState = createAudioMappingEvalState();
const fixtureValues = evaluateAudioMappings(
  fixtureShow,
  { rms: 0.5, peak: 0.2, bands: [0, 0, 0, 0], beatPulse: false },
  fixtureState,
  100
);
assert.equal(fixtureValues.get('show://Kick 1/1'), 128);

console.log('Running test: group band mapping fan-out');
const groupShow = createEmptyShow('Audio Group Mapping');
groupShow.fixtures.push({ name: 'Wash 1', fixtureId: 'VRSL_Light5CH' });
groupShow.fixtures.push({ name: 'Wash 2', fixtureId: 'VRSL_Light5CH' });
groupShow.groups.push({ name: 'Front Wash', fixtures: ['Wash 1', 'Wash 2'] });
groupShow.audioMappings = [
  {
    id: 'map-band',
    source: 'band',
    bandIndex: 2,
    targetType: 'group',
    targetId: 'Front Wash',
    attribute: 'Red',
    enabled: true,
    min: 0,
    max: 200,
    attackMs: 0,
    releaseMs: 0,
  },
];

const groupValues = evaluateAudioMappings(
  groupShow,
  { rms: 0, peak: 0, bands: [0.1, 0.2, 0.5, 0.1], beatPulse: false },
  createAudioMappingEvalState(),
  100
);
assert.equal(groupValues.get('show://Wash 1/2'), 100);
assert.equal(groupValues.get('show://Wash 2/2'), 100);

console.log('Running test: attack and release smoothing');
const smoothShow = createEmptyShow('Audio Smoothing');
smoothShow.fixtures.push({ name: 'Strobe 1', fixtureId: 'VRSL_Light5CH' });
smoothShow.audioMappings = [
  {
    id: 'map-smooth',
    source: 'peak',
    targetType: 'fixture',
    targetId: 'Strobe 1',
    attribute: 'Dimmer',
    enabled: true,
    min: 0,
    max: 255,
    attackMs: 100,
    releaseMs: 100,
  },
];
const smoothState = createAudioMappingEvalState();
evaluateAudioMappings(
  smoothShow,
  { rms: 0, peak: 0, bands: [0, 0, 0, 0], beatPulse: false },
  smoothState,
  0
);
const rising = evaluateAudioMappings(
  smoothShow,
  { rms: 0, peak: 1, bands: [0, 0, 0, 0], beatPulse: false },
  smoothState,
  50
);
const falling = evaluateAudioMappings(
  smoothShow,
  { rms: 0, peak: 0, bands: [0, 0, 0, 0], beatPulse: false },
  smoothState,
  100
);
assert.ok((rising.get('show://Strobe 1/1') ?? 0) > 120);
assert.ok((rising.get('show://Strobe 1/1') ?? 0) < 140);
assert.ok((falling.get('show://Strobe 1/1') ?? 0) > 50);
assert.ok((falling.get('show://Strobe 1/1') ?? 0) < 80);

console.log('Running test: beat pulse source');
const beatShow = createEmptyShow('Audio Beat');
beatShow.fixtures.push({ name: 'Hit 1', fixtureId: 'VRSL_Light5CH' });
beatShow.audioMappings = [
  {
    id: 'map-beat',
    source: 'beat',
    targetType: 'fixture',
    targetId: 'Hit 1',
    attribute: 'Strobe',
    enabled: true,
    min: 0,
    max: 255,
    attackMs: 0,
    releaseMs: 0,
  },
];
const beatState = createAudioMappingEvalState();
const beatOn = evaluateAudioMappings(
  beatShow,
  { rms: 0, peak: 0, bands: [0, 0, 0, 0], beatPulse: true },
  beatState,
  10
);
const beatOff = evaluateAudioMappings(
  beatShow,
  { rms: 0, peak: 0, bands: [0, 0, 0, 0], beatPulse: false },
  beatState,
  20
);
assert.equal(beatOn.get('show://Hit 1/5'), 255);
assert.equal(beatOff.get('show://Hit 1/5'), 0);

console.log('Audio mapping tests passed!');
