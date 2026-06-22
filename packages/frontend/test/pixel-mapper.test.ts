import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenPixelMatrixToChannels } from '../src/engine/pixel-mapper.ts';
import type { PixelMapDefinition } from '../src/show/document.ts';

const map: PixelMapDefinition = {
  id: 'm1',
  name: 'Test',
  width: 2,
  height: 1,
  channelOrder: 'rgb',
  fixtureChannels: [{ fixtureName: 'Par 1', x: 0, y: 0, startChannel: 1 }],
};

test('flattenPixelMatrixToChannels uses show:// paths', () => {
  const pixels = [[{ r: 10, g: 20, b: 30 }, { r: 0, g: 0, b: 0 }]];
  const result = flattenPixelMatrixToChannels(map, pixels);
  assert.equal(result.length, 3);
  assert.equal(result[0]?.path, 'show://Par 1/1');
  assert.equal(result[0]?.value, 10);
});
