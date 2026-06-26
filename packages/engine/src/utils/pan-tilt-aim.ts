/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { FixturePosition } from "../types";

export type Point3D = {
  x: number;
  y: number;
  z: number;
};

export type FocusAimResult = {
  pan16: number;
  tilt16: number;
  pan: number;
  panFine: number;
  tilt: number;
  tiltFine: number;
};

const EPSILON = 0.000001;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function to16BitComponents(value16: number): { coarse: number; fine: number } {
  const constrained = clamp(Math.round(value16), 0, 65535);
  return {
    coarse: Math.floor(constrained / 256),
    fine: constrained % 256,
  };
}

export function getDefaultFixturePosition(
  index: number,
  totalFixtures: number,
  spacing = 2,
): Point3D {
  const safeTotal = Math.max(1, totalFixtures);
  const columns = Math.max(1, Math.ceil(Math.sqrt(safeTotal)));
  const rows = Math.max(1, Math.ceil(safeTotal / columns));
  const row = Math.floor(index / columns);
  const col = index % columns;

  return {
    x: (col - (columns - 1) / 2) * spacing,
    y: 0,
    z: (row - (rows - 1) / 2) * spacing,
  };
}

export function resolveFixturePosition(
  position: FixturePosition | undefined,
  index: number,
  totalFixtures: number,
): Point3D {
  const fallback = getDefaultFixturePosition(index, totalFixtures);
  return {
    x: position?.x ?? fallback.x,
    y: position?.y ?? fallback.y,
    z: position?.z ?? fallback.z,
  };
}

export function computeAimPanTilt16Bit(
  source: Point3D,
  target: Point3D = { x: 0, y: 0, z: 0 },
): FocusAimResult | null {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dz = target.z - source.z;
  const distance = Math.hypot(dx, dy, dz);

  if (distance < EPSILON) {
    return null;
  }

  const yaw = Math.atan2(dx, dz);
  const horizontalDistance = Math.hypot(dx, dz);
  const pitch = Math.atan2(dy, horizontalDistance);

  const pan16 = Math.round(clamp((yaw + Math.PI) / (2 * Math.PI), 0, 1) * 65535);
  const tilt16 = Math.round(clamp((pitch + Math.PI / 2) / Math.PI, 0, 1) * 65535);

  const panParts = to16BitComponents(pan16);
  const tiltParts = to16BitComponents(tilt16);

  return {
    pan16,
    tilt16,
    pan: panParts.coarse,
    panFine: panParts.fine,
    tilt: tiltParts.coarse,
    tiltFine: tiltParts.fine,
  };
}
