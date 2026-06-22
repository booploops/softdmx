/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { AttributeFeature } from '../types/attributes.ts';
import type { Preset, PresetTarget } from 'src/show/document';
import type { ScratchEntry } from '../engine/layers/scratch.ts';
import type { ShowfileFixtureMapped } from '../types/index.ts';
import { filterScratchEntries } from './programmer-filter.ts';
import type { ProgrammerStoreMode } from '../stores/programmer.ts';

export interface ScratchPresetCapture {
  targets: PresetTarget[];
}

export function captureScratchPreset(
  entries: ScratchEntry[],
  mappedFixtures: ShowfileFixtureMapped[],
  mergedByPath: Map<string, number>,
  attributeFilter?: AttributeFeature[]
): ScratchPresetCapture {
  const filtered = filterScratchEntries(entries, attributeFilter);
  const attrsByFixture = new Map<string, Record<string, number>>();

  for (const entry of filtered) {
    const parts = entry.path.split('/');
    const fixtureName = parts[2];
    const channelIndex = parseInt(parts[3] ?? '0', 10) - 1;
    if (!fixtureName) continue;

    const mapped = mappedFixtures.find((fixture) => fixture.fixtureName === fixtureName);
    const channel = mapped?.def.channels[channelIndex];
    const channelName = entry.attributeName ?? channel?.name;
    if (!channelName) continue;

    if (!attrsByFixture.has(fixtureName)) {
      attrsByFixture.set(fixtureName, {});
    }
    attrsByFixture.get(fixtureName)![channelName] = mergedByPath.get(entry.path) ?? entry.value;
  }

  return {
    targets: Array.from(attrsByFixture.entries()).map(([fixture, attrs]) => ({
      fixtures: [fixture],
      attrs,
    })),
  };
}

export function mergePresetTargets(existing: PresetTarget[], incoming: PresetTarget[]): PresetTarget[] {
  const byFixture = new Map<string, Record<string, number>>();

  for (const target of existing) {
    for (const fixtureName of target.fixtures ?? []) {
      if (!byFixture.has(fixtureName)) byFixture.set(fixtureName, {});
      Object.assign(byFixture.get(fixtureName)!, target.attrs);
    }
  }

  for (const target of incoming) {
    for (const fixtureName of target.fixtures ?? []) {
      if (!byFixture.has(fixtureName)) byFixture.set(fixtureName, {});
      Object.assign(byFixture.get(fixtureName)!, target.attrs);
    }
  }

  return Array.from(byFixture.entries()).map(([fixture, attrs]) => ({
    fixtures: [fixture],
    attrs,
  }));
}

export function removePresetAttributes(
  existing: PresetTarget[],
  incoming: PresetTarget[]
): PresetTarget[] {
  const removeByFixture = new Map<string, Set<string>>();
  for (const target of incoming) {
    for (const fixtureName of target.fixtures ?? []) {
      if (!removeByFixture.has(fixtureName)) removeByFixture.set(fixtureName, new Set());
      for (const attrName of Object.keys(target.attrs)) {
        removeByFixture.get(fixtureName)!.add(attrName);
      }
    }
  }

  return existing
    .map((target) => {
      const attrs: Record<string, number> = {};
      for (const fixtureName of target.fixtures ?? []) {
        const removeSet = removeByFixture.get(fixtureName);
        for (const [attrName, value] of Object.entries(target.attrs)) {
          if (!removeSet?.has(attrName)) {
            attrs[attrName] = value;
          }
        }
      }
      return {
        ...target,
        attrs,
      };
    })
    .filter((target) => Object.keys(target.attrs).length > 0);
}

export function applyProgrammerStoreMode(
  mode: ProgrammerStoreMode,
  existing: Preset | undefined,
  capture: ScratchPresetCapture
): PresetTarget[] {
  if (mode === 'remove') {
    return existing ? removePresetAttributes(existing.targets, capture.targets) : [];
  }
  if (mode === 'merge' && existing) {
    return mergePresetTargets(existing.targets, capture.targets);
  }
  if (mode === 'update' && existing) {
    return mergePresetTargets(existing.targets, capture.targets);
  }
  return capture.targets;
}
