/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FixtureDefinition } from 'src/types';
import { builtinPlugin } from 'src/fixture-library/builtin/fixtures';
import { loadFixtureYaml, parsePluginManifest } from 'src/fixture-library/fixture-yaml';

const fixturesById = new Map<string, FixtureDefinition>();
let initialized = false;

function scanDirectory(
  dir: string,
  virtualPrefix: string,
  onFile: (virtualPath: string, absolutePath: string) => void
): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolutePath = join(dir, entry.name);
    const virtualPath = `${virtualPrefix}/${entry.name}`.replace(/\\/g, '/');

    if (entry.isDirectory()) {
      scanDirectory(absolutePath, virtualPath, onFile);
      continue;
    }

    onFile(virtualPath, absolutePath);
  }
}

function resolvePluginsRoot(): string | undefined {
  const candidates = [
    join(process.cwd(), 'src/fixture-library'),
    join(dirname(fileURLToPath(import.meta.url)), '../src/fixture-library'),
  ];

  return candidates.find((candidate) => existsSync(join(candidate, 'bundled')));
}

function registerFixture(fixture: FixtureDefinition): void {
  fixturesById.set(fixture.id, fixture);
}

function loadBundledFixturesFromDisk(): void {
  const pluginsRoot = resolvePluginsRoot();
  if (!pluginsRoot) return;

  const bundledRoot = join(pluginsRoot, 'bundled');
  if (!existsSync(bundledRoot)) return;

  scanDirectory(bundledRoot, 'bundled', (virtualPath, absolutePath) => {
    if (!virtualPath.endsWith('/plugin.json')) return;

    const manifest = parsePluginManifest(readFileSync(absolutePath, 'utf8'));
    const manifestDir = dirname(absolutePath);

    for (const fixturePath of manifest.fixtures) {
      const fixtureFile = join(manifestDir, fixturePath);
      if (!existsSync(fixtureFile)) continue;
      registerFixture(loadFixtureYaml(readFileSync(fixtureFile, 'utf8')));
    }
  });
}

function initFixtureLookup(): void {
  if (initialized) return;
  initialized = true;

  for (const fixture of builtinPlugin.fixtures ?? []) {
    registerFixture(fixture);
  }

  loadBundledFixturesFromDisk();
}

export function getFixtureDefinitionFromDisk(fixtureId: string): FixtureDefinition | undefined {
  initFixtureLookup();
  return fixturesById.get(fixtureId);
}
