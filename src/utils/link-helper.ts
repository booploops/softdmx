/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Maps sub-beat phase relative to a quantum grid to a standard angle (0 to 2pi radians).
 */
export function phaseToTheta(phase: number, quantum = 4.0): number {
  if (quantum <= 0) return 0;
  // Normalize phase to 0..quantum
  const normalizedPhase = ((phase % quantum) + quantum) % quantum;
  return (normalizedPhase / quantum) * 2.0 * Math.PI;
}

/**
 * Calculates a sinusoidal LFO output scaled to the DMX range (0-255).
 */
export function thetaToLfoValue(theta: number): number {
  const sinVal = Math.sin(theta); // Range: -1.0 to 1.0
  const normalized = (sinVal + 1.0) / 2.0; // Range: 0.0 to 1.0
  return Math.max(0, Math.min(255, Math.round(normalized * 255)));
}
