/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export type SpreadMode = 'linear' | 'random' | 'reverse';

export function computeSpreadPhase(
  index: number,
  count: number,
  spread = 1,
  wings = 0,
  mode: SpreadMode = 'linear'
): number {
  if (count <= 0) return 0;
  const safeSpread = Math.max(0, spread);
  const normalizedIndex = count <= 1 ? 0 : index / (count - 1);

  let phase = normalizedIndex * safeSpread;
  if (wings > 0 && count > 1) {
    const wingSize = Math.ceil(count / Math.max(1, wings));
    const wingIndex = Math.floor(index / wingSize);
    const withinWing = index % wingSize;
    const wingSpan = Math.max(1, wingSize - 1);
    const wingDirection = wingIndex % 2 === 0 ? 1 : -1;
    phase = (withinWing / wingSpan) * safeSpread * wingDirection;
  }

  if (mode === 'reverse') {
    phase = safeSpread - phase;
  } else if (mode === 'random') {
    phase = hashUnit(`${index}:${count}:${safeSpread}`) * safeSpread;
  }

  return phase;
}

export function waveformValue(
  waveform: 'sine' | 'triangle' | 'square',
  phase: number
): number {
  const t = phase % 1;
  switch (waveform) {
    case 'triangle':
      return t < 0.5 ? t * 2 : 2 - t * 2;
    case 'square':
      return t < 0.5 ? 1 : 0;
    case 'sine':
    default:
      return (Math.sin(t * Math.PI * 2) + 1) / 2;
  }
}

function hashUnit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}
