import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateShowDocument } from '../../frontend/src/show/migrate.ts';

test('migrateShowDocument upgrades 1.2 to 1.5 with video defaults', () => {
  const migrated = migrateShowDocument({
    version: '1.2',
    meta: { name: 'Legacy', created: '2020', modified: '2020' },
    fixtures: [],
  });

  assert.equal(migrated.version, '1.5');
  assert.equal(migrated.video?.enabled, false);
  assert.equal(migrated.video?.inputKind, 'none');
  assert.deepEqual(migrated.video?.pixelMapIds, []);
});

test('migrateShowDocument upgrades 1.3 pixelMapId to pixelMapIds', () => {
  const migrated = migrateShowDocument({
    version: '1.3',
    meta: { name: 'Legacy', created: '2020', modified: '2020' },
    fixtures: [],
    video: {
      enabled: true,
      pixelMapId: 'map-a',
      inputKind: 'webcam',
    },
  });

  assert.equal(migrated.version, '1.5');
  assert.deepEqual(migrated.video?.pixelMapIds, ['map-a']);
});

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
