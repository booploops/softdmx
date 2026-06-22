import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateShowDocument } from '../src/utils/show-migrate.ts';

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
