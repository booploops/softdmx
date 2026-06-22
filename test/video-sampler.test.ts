import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleFrameToPixelGrid } from '../src/engine/video-sampler.ts';
import type { PixelMapDefinition } from '../src/show/document.ts';

const map: PixelMapDefinition = {
  id: 'm1',
  name: 'Crop',
  width: 2,
  height: 2,
  channelOrder: 'rgb',
  fixtureChannels: [],
  sampleRegion: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
};

test('sampleFrameToPixelGrid crops normalized region', () => {
  const data = new Uint8Array(4 * 4 * 4);
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const i = (y * 4 + x) * 4;
      data[i] = x * 50;
      data[i + 1] = y * 50;
      data[i + 2] = 128;
    }
  }

  const grid = sampleFrameToPixelGrid({ width: 4, height: 4, data }, map);
  assert.equal(grid.length, 2);
  assert.ok(grid[0]![0]!.r >= 0);
  assert.ok(grid[1]![1]!.g > grid[0]![0]!.g);
});
