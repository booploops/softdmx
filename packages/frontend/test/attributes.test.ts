import assert from 'node:assert/strict';
import {
  buildAttributeDefinitions,
  inferAttributeFeature,
  inferAttributeMerge,
} from '../src/engine/attributes.ts';
import type { FixtureDefinition } from '../src/types/index.ts';

const sampleFixture: FixtureDefinition = {
  id: 'test-fixture',
  name: 'Test Fixture',
  channels: [
    { name: 'Dimmer', type: 'intensity' },
    { name: 'Red', type: 'color' },
    { name: 'Pan', type: 'position' },
    { name: 'Gobo', type: 'gobo' },
  ],
};

assert.equal(inferAttributeFeature('intensity', 'Dimmer'), 'dimmer');
assert.equal(inferAttributeFeature('color', 'Red'), 'color');
assert.equal(inferAttributeMerge('dimmer'), 'htp');
assert.equal(inferAttributeMerge('position'), 'ltp');

const attrs = buildAttributeDefinitions(sampleFixture);
assert.equal(attrs.length, 4);
assert.equal(attrs[0]?.feature, 'dimmer');
assert.equal(attrs[2]?.feature, 'position');

console.log('attributes tests passed');
