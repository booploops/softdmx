/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { FixtureChannelDefinition } from '@softdmx/engine';
import type { ShowfileFixtureMapped } from '@softdmx/engine';

export function parseGroupPath(path: string): { groupName: string; attributeName: string } | null {
  if (!path.startsWith('group://')) return null;
  const raw = path.slice('group://'.length);
  const splitAt = raw.indexOf('/');
  if (splitAt < 0) return null;
  const encodedGroup = raw.slice(0, splitAt);
  const encodedAttr = raw.slice(splitAt + 1);
  if (!encodedGroup || !encodedAttr) return null;
  return {
    groupName: decodeURIComponent(encodedGroup),
    attributeName: decodeURIComponent(encodedAttr),
  };
}

export function parseFixturePath(path: string): { fixtureName: string; channelIndex: number } | null {
  if (!path.startsWith('show://')) return null;
  const raw = path.slice('show://'.length);
  const splitAt = raw.lastIndexOf('/');
  if (splitAt < 0) return null;
  const fixtureName = raw.slice(0, splitAt);
  const channelIndex = parseInt(raw.slice(splitAt + 1), 10) - 1;
  if (!fixtureName || Number.isNaN(channelIndex) || channelIndex < 0) return null;
  return { fixtureName, channelIndex };
}

export function resolveChannelForPath(
  path: string,
  mappedFixtures: ShowfileFixtureMapped[]
): FixtureChannelDefinition | null {
  const groupPath = parseGroupPath(path);
  if (groupPath) {
    const template = mappedFixtures[0];
    if (!template) return null;
    return template.def.channels.find((channel) => channel.name === groupPath.attributeName) ?? null;
  }

  const fixturePath = parseFixturePath(path);
  if (!fixturePath) return null;

  const mapped = mappedFixtures.find((fixture) => fixture.fixtureName === fixturePath.fixtureName);
  return mapped?.def.channels[fixturePath.channelIndex] ?? null;
}

export function resolveOperatorColor(entry: {
  meta?: { color?: string };
  clientId?: string;
}): string | undefined {
  return entry.meta?.color;
}
