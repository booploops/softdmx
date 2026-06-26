/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { FixtureDefinition } from '@softdmx/engine';
import {
  loadFixtureYaml,
  parsePluginManifest,
  type PluginManifest,
} from '@softdmx/engine';

export type { PluginManifest } from '@softdmx/engine';

let bundledManifestRaw: Record<string, string> | undefined;
let bundledFixtureRaw: Record<string, string> | undefined;

function ensureBundledAssetsLoaded(): void {
  if (bundledManifestRaw !== undefined) return;

  bundledManifestRaw = import.meta.glob('./bundled/**/plugin.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  bundledFixtureRaw = {
    ...import.meta.glob('./bundled/**/*.yaml', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
    ...import.meta.glob('./bundled/**/*.yml', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
    ...import.meta.glob('../fixtures/**/*.yaml', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
    ...import.meta.glob('../fixtures/**/*.yml', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  };
}

function getBundledManifestRaw(): Record<string, string> {
  ensureBundledAssetsLoaded();
  return bundledManifestRaw ?? {};
}

function getBundledFixtureRaw(): Record<string, string> {
  ensureBundledAssetsLoaded();
  return bundledFixtureRaw ?? {};
}

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

function dirname(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(0, idx) : '.';
}

function joinPath(base: string, relative: string): string {
  const raw = `${base}/${relative}`;
  const segments = raw.split('/');
  const out: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      out.pop();
      continue;
    }
    out.push(segment);
  }

  return out.join('/');
}

function buildPathCandidates(path: string): string[] {
  const normalized = normalizeRelativePath(path);
  const withoutPrefix = normalized
    .replace(/^\.?\//, '')
    .replace(/^src\/plugins\//, '')
    .replace(/^plugins\//, '');

  return [
    normalized,
    `./${withoutPrefix}`,
    `../${withoutPrefix}`,
    `./bundled/${withoutPrefix}`,
    `../fixtures/${withoutPrefix}`,
  ];
}

export { loadFixtureYaml } from '@softdmx/engine';

export function loadPluginManifest(path: string): PluginManifest {
  const manifestKey = buildPathCandidates(path).find(
    (candidate) => candidate in getBundledManifestRaw()
  );
  if (!manifestKey) {
    throw new Error(`Plugin manifest not found: ${path}`);
  }

  return parsePluginManifest(getBundledManifestRaw()[manifestKey] ?? '');
}

export function getBundledPluginIds(): string[] {
  const ids = new Set<string>();
  for (const manifestPath of Object.keys(getBundledManifestRaw())) {
    const id = loadPluginManifest(manifestPath).id;
    ids.add(id);
  }
  return [...ids].sort();
}

export function getManifestPathForPluginId(pluginId: string): string | undefined {
  for (const manifestPath of Object.keys(getBundledManifestRaw())) {
    const manifest = loadPluginManifest(manifestPath);
    if (manifest.id === pluginId) {
      return manifestPath;
    }
  }
  return undefined;
}

export function loadBundledFixtureYaml(manifestPath: string, fixturePath: string): FixtureDefinition {
  const base = dirname(normalizeRelativePath(manifestPath));
  const relative = normalizeRelativePath(fixturePath).replace(/^\.?\//, '');
  const resolved = `./${joinPath(base.replace(/^\.\//, ''), relative)}`;

  const yamlRaw = getBundledFixtureRaw()[resolved];
  if (!yamlRaw) {
    throw new Error(`Fixture YAML not found: ${fixturePath} (manifest ${manifestPath})`);
  }

  return loadFixtureYaml(yamlRaw);
}

export function loadFixtureYamlFromPath(path: string): FixtureDefinition {
  const fixtureKey = buildPathCandidates(path).find(
    (candidate) => candidate in getBundledFixtureRaw()
  );
  if (!fixtureKey) {
    throw new Error(`Fixture YAML not found: ${path}`);
  }
  return loadFixtureYaml(getBundledFixtureRaw()[fixtureKey] ?? '');
}
