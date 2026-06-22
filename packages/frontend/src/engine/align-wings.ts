/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowDocumentV1 } from 'src/types/show-document';

export type AlignMode = 'none' | 'pan' | 'tilt' | 'x' | 'y';
export type WingDirection = 'out' | 'in' | 'alternate';

export interface AlignWingsOptions {
  alignMode?: AlignMode;
  wings?: number;
  wingDirection?: WingDirection;
}

export function wingScaleForIndex(
  index: number,
  count: number,
  wings: number,
  direction: WingDirection = 'out'
): number {
  if (wings <= 0 || count <= 1) return 1;
  const wingSize = Math.ceil(count / wings);
  const wingIndex = Math.floor(index / wingSize);
  const withinWing = index % wingSize;
  const wingSpan = Math.max(1, wingSize - 1);
  const centerDistance = Math.abs(withinWing / wingSpan - 0.5) * 2;

  let scale = direction === 'in' ? 1 - centerDistance : centerDistance;
  if (direction === 'alternate' && wingIndex % 2 === 1) {
    scale = 1 - scale;
  }
  return Math.max(0, Math.min(1, scale));
}

export function alignValueForFixture(
  show: ShowDocumentV1,
  fixtureName: string,
  alignMode: AlignMode
): number | null {
  const fixture = show.fixtures.find((entry) => entry.name === fixtureName);
  if (!fixture?.position) return null;

  switch (alignMode) {
    case 'pan':
      return fixture.position.pan ?? fixture.position.x ?? null;
    case 'tilt':
      return fixture.position.tilt ?? fixture.position.y ?? null;
    case 'x':
      return fixture.position.x ?? null;
    case 'y':
      return fixture.position.y ?? null;
    default:
      return null;
  }
}

export function applyWingOffset(baseValue: number, scale: number, depth = 255): number {
  return Math.round(baseValue + (scale - 0.5) * depth);
}
