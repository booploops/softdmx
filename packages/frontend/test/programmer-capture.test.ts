import assert from 'node:assert/strict';
import {
  applyProgrammerStoreMode,
  captureScratchPreset,
  mergePresetTargets,
  removePresetAttributes,
} from '../src/utils/programmer-capture.ts';
import type { ScratchEntry } from '../src/engine/layers/scratch.ts';
import { filterScratchEntries } from '../src/utils/programmer-filter.ts';

const entries: ScratchEntry[] = [
  { path: 'show://Light 1/1', value: 200, attributeType: 'intensity', feature: 'dimmer', touchedAt: 1 },
  { path: 'show://Light 1/2', value: 128, attributeType: 'color', feature: 'color', touchedAt: 1 },
];

const mapped = [
  {
    fixtureName: 'Light 1',
    def: {
      id: 'f1',
      name: 'F1',
      channels: [
        { name: 'Dimmer', type: 'intensity', minValue: 0, maxValue: 255, defaultValue: 0, reference: { id: 1, path: 'show://Light 1/1', value: 0 } },
        { name: 'Red', type: 'color', minValue: 0, maxValue: 255, defaultValue: 0, reference: { id: 2, path: 'show://Light 1/2', value: 0 } },
      ],
    },
  },
];

const mergedByPath = new Map(entries.map((entry) => [entry.path, entry.value]));
const capture = captureScratchPreset(entries, mapped as never, mergedByPath, ['dimmer']);
assert.equal(capture.targets.length, 1);
assert.equal(capture.targets[0]?.attrs.Dimmer, 200);

const colorOnly = filterScratchEntries(entries, ['color']);
assert.equal(colorOnly.length, 1);

const merged = mergePresetTargets(
  [{ fixtures: ['Light 1'], attrs: { Dimmer: 100 } }],
  [{ fixtures: ['Light 1'], attrs: { Red: 255 } }]
);
assert.equal(merged[0]?.attrs.Dimmer, 100);
assert.equal(merged[0]?.attrs.Red, 255);

const removed = removePresetAttributes(
  [{ fixtures: ['Light 1'], attrs: { Dimmer: 100, Red: 255 } }],
  [{ fixtures: ['Light 1'], attrs: { Red: 255 } }]
);
assert.equal(removed[0]?.attrs.Red, undefined);
assert.equal(removed[0]?.attrs.Dimmer, 100);

const storeTargets = applyProgrammerStoreMode('store', undefined, capture);
assert.equal(storeTargets[0]?.attrs.Dimmer, 200);

console.log('programmer-capture tests passed');
