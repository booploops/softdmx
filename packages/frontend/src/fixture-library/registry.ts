/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { FixtureDefinition } from '@softdmx/engine';
import type { SoftDMXPlugin } from '@softdmx/engine';
import { builtinPlugin } from './builtin/index.ts';
import { ref } from 'vue';
import {
  getBundledPluginIds,
  getManifestPathForPluginId,
  loadBundledFixtureYaml,
  loadPluginManifest,
  loadFixtureYaml,
} from './loader';
import { loadFixtureFromGdtf } from '@softdmx/engine';

const plugins = new Map<string, SoftDMXPlugin>();
const runtimePluginId = 'runtime-imports';
export const pluginRegistryVersion = ref(0);

export function initPluginRegistry(): void {
  loadPluginsFromIds(['builtin', ...getBundledPluginIds()]);
}

export function registerPlugin(plugin: SoftDMXPlugin): void {
  plugins.set(plugin.id, plugin);
  pluginRegistryVersion.value += 1;
}

export function clearPluginRegistry(): void {
  plugins.clear();
  pluginRegistryVersion.value += 1;
}

export function loadPluginsFromIds(pluginIds: string[]): void {
  clearPluginRegistry();

  for (const pluginId of new Set(pluginIds)) {
    if (pluginId === builtinPlugin.id) {
      registerPlugin(builtinPlugin);
      continue;
    }

    const manifestPath = getManifestPathForPluginId(pluginId);
    if (!manifestPath) {
      throw new Error(`Unknown plugin id: ${pluginId}`);
    }

    const manifest = loadPluginManifest(manifestPath);
    const fixtures = manifest.fixtures.map((fixturePath: string) =>
      loadBundledFixtureYaml(manifestPath, fixturePath)
    );

    registerPlugin({
      id: manifest.id,
      version: manifest.version,
      fixtures,
    });
  }
}

export function registerRuntimeFixtureFromGdtf(bytes: Uint8Array, fileName?: string): FixtureDefinition {
  const fixture = loadFixtureFromGdtf(bytes, fileName);
  return registerRuntimeFixture(fixture);
}

function registerRuntimeFixture(fixture: FixtureDefinition): FixtureDefinition {
  const runtimePlugin: SoftDMXPlugin = plugins.get(runtimePluginId) ?? {
    id: runtimePluginId,
    version: '1.0.0',
    fixtures: [],
  };

  const fixtures = runtimePlugin.fixtures ?? [];
  const existingIndex = fixtures.findIndex((f: FixtureDefinition) => f.id === fixture.id);
  if (existingIndex >= 0) {
    fixtures[existingIndex] = fixture;
  } else {
    fixtures.push(fixture);
  }

  registerPlugin({
    ...runtimePlugin,
    fixtures,
  });

  return fixture;
}

export function registerRuntimeFixtureFromYaml(yaml: string): FixtureDefinition {
  const fixture = loadFixtureYaml(yaml);
  return registerRuntimeFixture(fixture);
}

export function getFixtureDefinition(fixtureId: string): FixtureDefinition | undefined {
  const runtimeFixture = plugins
    .get(runtimePluginId)
    ?.fixtures?.find((fixture: FixtureDefinition) => fixture.id === fixtureId);
  if (runtimeFixture) {
    return runtimeFixture;
  }

  for (const plugin of plugins.values()) {
    const fixture = plugin.fixtures?.find((f: FixtureDefinition) => f.id === fixtureId);
    if (fixture) return fixture;
  }
  return undefined;
}

export function getAllFixtures(): FixtureDefinition[] {
  const fixturesById = new Map<string, FixtureDefinition>();
  for (const plugin of plugins.values()) {
    if (plugin.fixtures) {
      for (const fixture of plugin.fixtures) {
        fixturesById.set(fixture.id, fixture);
      }
    }
  }
  return [...fixturesById.values()];
}

export function getPlugin(id: string): SoftDMXPlugin | undefined {
  return plugins.get(id);
}

// Initialize on module load
initPluginRegistry();
