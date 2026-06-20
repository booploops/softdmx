import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateShowDocument } from '../src/utils/show-migrate.ts';

test('migrateShowDocument upgrades 1.4 to 1.5 with preset pools and backup', () => {
  const migrated = migrateShowDocument({
    version: '1.4',
    meta: { name: 'Legacy', created: '2020', modified: '2020' },
    fixtures: [],
    presets: [{ id: 'p1', name: 'Look', targets: [] }],
    cues: [
      {
        id: 'cue-1',
        name: 'Stack',
        view: 'stack',
        stack: [{ id: 'step-1', label: 'A', presetId: 'p1', fadeIn: 0 }],
        layers: [],
        created: '2020',
        modified: '2020',
      },
    ],
  });

  assert.equal(migrated.version, '1.5');
  assert.equal(migrated.meta?.sessionEpoch, 0);
  assert.equal(migrated.presetPools?.length, 1);
  assert.equal(migrated.presetPools?.[0]?.slots[0], 'p1');
  assert.equal(migrated.backup?.role, 'primary');
  assert.equal(migrated.cues?.[0]?.parts?.length, 1);
  assert.equal(migrated.cues?.[0]?.parts?.[0]?.presetId, 'p1');
});
