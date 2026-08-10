/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowDocument, Preset, ShowGroup } from "../show/document";
import type { ActiveChannel } from "../types/fixture";
import { getFixtureDefinition } from "../fixture-library/lookup";
import { resolveFixtureChannelsForMode } from "../fixture-library/gdtf/gdtf-to-fixture";

export interface ResolvedChannelTarget {
  path: string;
  channelName: string;
  attributeType: string;
}

export function resolveGroupFixtures(show: ShowDocument, groupName: string): string[] {
  const group = show.groups.find((g) => g.name === groupName);
  return group?.fixtures ?? [];
}

/** Resolve fixture names from fixtures[], groups[], and legacy group (union). */
export function resolveTargetFixtureNames(
  show: ShowDocument,
  target: { fixtures?: string[]; group?: string; groups?: string[] },
): string[] {
  const names = new Set<string>();

  for (const fixtureName of target.fixtures ?? []) {
    names.add(fixtureName);
  }

  const groupNames = [
    ...(target.groups ?? []),
    ...(target.group ? [target.group] : []),
  ];
  for (const groupName of groupNames) {
    for (const fixtureName of resolveGroupFixtures(show, groupName)) {
      names.add(fixtureName);
    }
  }

  return Array.from(names);
}

export function resolvePresetTargets(show: ShowDocument, preset: Preset): ResolvedChannelTarget[] {
  const results: ResolvedChannelTarget[] = [];

  for (const target of preset.targets) {
    const fixtureNames = resolveTargetFixtureNames(show, target);

    for (const fixtureName of fixtureNames) {
      const fixture = show.fixtures.find((f) => f.name === fixtureName);
      if (!fixture) continue;

      const def = getFixtureDefinition(fixture.fixtureId);
      if (!def) continue;

      for (const [attrName, value] of Object.entries(target.attrs)) {
        const channelIndex = def.channels.findIndex((c) => c.name === attrName);
        if (channelIndex === -1) continue;

        results.push({
          path: `show://${fixtureName}/${channelIndex + 1}`,
          channelName: attrName,
          attributeType: def.channels[channelIndex]!.type,
        });
      }
    }
  }

  return results;
}

export function presetToChannels(
  show: ShowDocument,
  preset: Preset,
): Map<string, { value: number; attributeType: string }> {
  const map = new Map<string, { value: number; attributeType: string }>();

  for (const target of preset.targets) {
    const fixtureNames = resolveTargetFixtureNames(show, target);

    for (const fixtureName of fixtureNames) {
      const fixture = show.fixtures.find((f) => f.name === fixtureName);
      if (!fixture) continue;

      const def = getFixtureDefinition(fixture.fixtureId);
      if (!def) continue;

      for (const [attrName, value] of Object.entries(target.attrs)) {
        const channelIndex = def.channels.findIndex((c) => c.name === attrName);
        if (channelIndex === -1) continue;

        const path = `show://${fixtureName}/${channelIndex + 1}`;
        map.set(path, {
          value,
          attributeType: def.channels[channelIndex]!.type,
        });
      }
    }
  }

  return map;
}

/** Resolve effect attribute names from attrs[] and legacy attr. */
export function resolveEffectAttributeNames(target: {
  attr?: string;
  attrs?: string[];
}): string[] {
  const names: string[] = [];
  for (const attr of target.attrs ?? []) {
    if (attr && !names.includes(attr)) names.push(attr);
  }
  if (!names.length && target.attr) names.push(target.attr);
  return names;
}

export function resolveEffectTargets(
  show: ShowDocument,
  target: {
    fixtures?: string[];
    group?: string;
    groups?: string[];
    attr?: string;
    attrs?: string[];
  },
): { path: string; attributeType: string; fixtureIndex: number }[] {
  const fixtureNames = resolveTargetFixtureNames(show, target);
  const attrNames = resolveEffectAttributeNames(target);
  const results: { path: string; attributeType: string; fixtureIndex: number }[] = [];

  fixtureNames.forEach((fixtureName, fixtureIndex) => {
    const fixture = show.fixtures.find((f) => f.name === fixtureName);
    if (!fixture) return;

    const def = getFixtureDefinition(fixture.fixtureId);
    if (!def) return;

    for (const attrName of attrNames) {
      const channelIndex = def.channels.findIndex((c) => c.name === attrName);
      if (channelIndex === -1) continue;

      results.push({
        path: `show://${fixtureName}/${channelIndex + 1}`,
        attributeType: def.channels[channelIndex]!.type,
        fixtureIndex,
      });
    }
  });

  return results;
}

export function buildChannelMap(show: ShowDocument): ActiveChannel[] {
  const channels: ActiveChannel[] = [];
  const destinationIndices = new Map<string, number>();

  for (const fixture of show.fixtures) {
    const def = getFixtureDefinition(fixture.fixtureId);
    if (!def) continue;

    const modeChannels = resolveFixtureChannelsForMode(def, fixture.modeId);
    const destId = fixture.outputDestinationId ?? "default-gridnode";
    const autoIndex = destinationIndices.get(destId) ?? 1;
    const startingChannel = fixture.startingChannel ?? autoIndex;

    modeChannels.forEach((channel, index) => {
      channels.push({
        id: startingChannel + index,
        universe: destId,
        path: `show://${fixture.name}/${index + 1}`,
        value: channel.defaultValue,
        attributeType: channel.type,
      });
    });

    destinationIndices.set(destId, startingChannel + modeChannels.length);
  }

  return channels;
}

export function getGroupForFixture(show: ShowDocument, fixtureName: string): ShowGroup | undefined {
  return show.groups.find((g) => g.fixtures.includes(fixtureName));
}
