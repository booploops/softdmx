/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Notify } from 'quasar';
import {
  registerRuntimeFixtureFromGdtf,
  registerRuntimeFixtureFromYaml,
  downloadFixtureGdtf,
  downloadFixtureYaml,
  getFixtureDefinition,
} from 'src/fixture-library';

async function readFileBytes(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

export function useFixtureImport() {
  async function importFixtureFile(file: File) {
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith('.gdtf')) {
        const bytes = await readFileBytes(file);
        const fixture = registerRuntimeFixtureFromGdtf(bytes, file.name);
        Notify.create({ type: 'positive', message: `Imported GDTF fixture ${fixture.name}` });
        return fixture;
      }

      if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
        const yaml = await file.text();
        const fixture = registerRuntimeFixtureFromYaml(yaml);
        Notify.create({ type: 'positive', message: `Imported YAML fixture ${fixture.name}` });
        return fixture;
      }

      throw new Error('Unsupported fixture file type');
    } catch (error) {
      Notify.create({
        type: 'negative',
        message: error instanceof Error ? error.message : 'Fixture import failed',
      });
      return null;
    }
  }

  function exportFixture(fixtureId: string, format: 'yaml' | 'gdtf') {
    const fixture = getFixtureDefinition(fixtureId);
    if (!fixture) {
      Notify.create({ type: 'negative', message: 'Fixture type not found' });
      return false;
    }

    const ok = format === 'yaml' ? downloadFixtureYaml(fixture) : downloadFixtureGdtf(fixture);
    if (ok) {
      Notify.create({ type: 'positive', message: `Exported ${fixture.name} as ${format.toUpperCase()}` });
    }
    return ok;
  }

  return {
    importFixtureFile,
    exportFixture,
  };
}
