/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowfileGroup } from 'src/types/show-document';

export const GROUP_COLOR_PALETTE = [
  '#e53935',
  '#1e88e5',
  '#43a047',
  '#fb8c00',
  '#8e24aa',
  '#00acc1',
  '#fdd835',
  '#d81b60',
  '#6d4c41',
  '#546e7a',
] as const;

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidGroupColor(color: string | undefined): color is string {
  return typeof color === 'string' && HEX_COLOR_PATTERN.test(color.trim());
}

export function normalizeGroupColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  const trimmed = color.trim();
  return isValidGroupColor(trimmed) ? trimmed : undefined;
}

export function defaultGroupColorForIndex(index: number): string {
  const palette = GROUP_COLOR_PALETTE;
  return palette[index % palette.length] ?? palette[0] ?? '#1e88e5';
}

export function resolveGroupColor(group: Pick<ShowfileGroup, 'color'>, index: number): string {
  return normalizeGroupColor(group.color) ?? defaultGroupColorForIndex(index);
}

export type FixtureGroupInfo = {
  groupName: string;
  color: string;
};

export function buildFixtureGroupLookup(groups: ShowfileGroup[]): Map<string, FixtureGroupInfo> {
  const lookup = new Map<string, FixtureGroupInfo>();

  groups.forEach((group, index) => {
    const color = resolveGroupColor(group, index);
    for (const fixtureName of group.fixtures) {
      if (!lookup.has(fixtureName)) {
        lookup.set(fixtureName, { groupName: group.name, color });
      }
    }
  });

  return lookup;
}

export function groupColorStyle(color: string | undefined): Record<string, string> | undefined {
  if (!color) return undefined;
  return { '--fixture-group-color': color };
}
