import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createVideoMappingEvalState,
  evaluateVideoMapping,
} from '../src/engine/video-mapping.ts';
import type { ShowDocumentV1 } from '../src/types/show-document.ts';
import { createEmptyShow } from '../src/types/show-document.ts';

function baseShow(): ShowDocumentV1 {
  return {
    ...createEmptyShow('Video test'),
    pixelMaps: [
      {
        id: 'map-1',
        name: 'Map 1',
        width: 1,
        height: 1,
        channelOrder: 'rgb',
        videoGain: 1,
        videoSmoothingMs: 0,
        fixtureChannels: [{ fixtureName: 'Par 1', x: 0, y: 0, startChannel: 1 }],
      },
      {
        id: 'map-2',
        name: 'Map 2',
        width: 1,
        height: 1,
        channelOrder: 'rgb',
        videoGain: 1,
        videoSmoothingMs: 0,
        fixtureChannels: [{ fixtureName: 'Par 2', x: 0, y: 0, startChannel: 1 }],
      },
    ],
    fixtures: [
      { name: 'Par 1', fixtureId: 'VRSL_Light5CH', outputDestinationId: 'default-gridnode', startingChannel: 1 },
      { name: 'Par 2', fixtureId: 'VRSL_Light5CH', outputDestinationId: 'default-gridnode', startingChannel: 1 },
    ],
    video: {
      enabled: true,
      pixelMapIds: ['map-1'],
      inputKind: 'webcam',
      deviceId: null,
      senderName: null,
      blackLevel: 0,
      followDimmer: false,
      fps: 30,
    },
  };
}

test('evaluateVideoMapping applies per-map gain and outputs channel paths', () => {
  const show = baseShow();
  show.pixelMaps![0]!.videoGain = 0.5;
  const state = createVideoMappingEvalState();
  const pixelsByMap = new Map([['map-1', [[{ r: 100, g: 120, b: 140 }]]]]);
  const values = evaluateVideoMapping(show, pixelsByMap, state, 0);
  assert.equal(values.get('show://Par 1/1'), 50);
  assert.equal(values.get('show://Par 1/2'), 60);
});

test('evaluateVideoMapping uses per-map gain independently', () => {
  const show = {
    ...baseShow(),
    video: {
      ...baseShow().video,
      pixelMapIds: ['map-1', 'map-2'],
    },
  };
  show.pixelMaps![0]!.videoGain = 1;
  show.pixelMaps![1]!.videoGain = 2;

  const state = createVideoMappingEvalState();
  const pixelsByMap = new Map([
    ['map-1', [[{ r: 100, g: 0, b: 0 }]]],
    ['map-2', [[{ r: 100, g: 0, b: 0 }]]],
  ]);
  const values = evaluateVideoMapping(show, pixelsByMap, state, 0);
  assert.equal(values.get('show://Par 1/1'), 100);
  assert.equal(values.get('show://Par 2/1'), 200);
});

test('evaluateVideoMapping merges multiple pixel maps with HTP', () => {
  const show = {
    ...baseShow(),
    video: {
      ...baseShow().video,
      pixelMapIds: ['map-1', 'map-2'],
    },
  };
  const state = createVideoMappingEvalState();
  const pixelsByMap = new Map([
    ['map-1', [[{ r: 40, g: 10, b: 10 }]]],
    ['map-2', [[{ r: 200, g: 5, b: 5 }]]],
  ]);
  const values = evaluateVideoMapping(show, pixelsByMap, state, 0);
  assert.equal(values.get('show://Par 1/1'), 40);
  assert.equal(values.get('show://Par 2/1'), 200);
});
