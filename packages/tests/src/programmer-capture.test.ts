import assert from 'node:assert/strict';
import {
  applyProgrammerStoreMode,
  captureScratchPreset,
  mergePresetTargets,
  removePresetAttributes,
} from '../../frontend/src/utils/programmer-capture.ts';
import type { ScratchEntry } from '../../frontend/src/engine/layers/scratch.ts';
import {
  filterScratchEntries,
  scratchEntryMatchesCustomGroup,
} from '../../frontend/src/utils/programmer-filter.ts';

const entries: ScratchEntry[] = [
  {
    path: 'show://Light 1/1',
    value: 200,
    attributeType: 'intensity',
    feature: 'dimmer',
    touchedAt: 1,
    clientId: 'operator-a',
  },
  {
    path: 'show://Light 1/2',
    value: 128,
    attributeType: 'color',
    feature: 'color',
    touchedAt: 1,
    clientId: 'operator-b',
  },
  {
    path: 'show://Light 2/1',
    value: 64,
    attributeType: 'intensity',
    feature: 'dimmer',
    touchedAt: 1,
    clientId: 'operator-a',
  },
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
  {
    fixtureName: 'Light 2',
    def: {
      id: 'f2',
      name: 'F2',
      channels: [
        { name: 'Dimmer', type: 'intensity', minValue: 0, maxValue: 255, defaultValue: 0, reference: { id: 3, path: 'show://Light 2/1', value: 0 } },
      ],
    },
  },
];

const mergedByPath = new Map(entries.map((entry) => [entry.path, entry.value]));
const capture = captureScratchPreset(entries, mapped as never, mergedByPath, ['dimmer']);
assert.equal(capture.targets.length, 2);
assert.equal(capture.targets[0]?.attrs.Dimmer, 200);

const colorOnly = filterScratchEntries(entries, ['color']);
assert.equal(colorOnly.length, 1);

const clientAOnly = filterScratchEntries(entries, undefined, { clientId: 'operator-a' });
assert.equal(clientAOnly.length, 2);

const activeOnly = captureScratchPreset(entries, mapped as never, mergedByPath, ['dimmer'], {
  activeOnly: true,
  activePaths: ['show://Light 1/1'],
});
assert.equal(activeOnly.targets.length, 1);
assert.equal(activeOnly.targets[0]?.fixtures[0], 'Light 1');

const customGroupMatch = scratchEntryMatchesCustomGroup(
  { ...entries[1]!, attributeName: 'Red' },
  {
    id: 'warm',
    label: 'Warm',
    channelNameIncludes: ['red'],
  },
);
assert.equal(customGroupMatch, true);

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
