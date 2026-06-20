/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ShowDocumentV1, ShowSubmaster } from 'src/types/show-document';

export function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function computeCuePlaybackIntensity(
  stateIntensity: number,
  playbackBusMaster: number,
  cueSubmasterScale: number
): number {
  return clampUnit(stateIntensity) * clampUnit(playbackBusMaster) * clampUnit(cueSubmasterScale);
}

export function resolveCueSubmasterScale(
  show: ShowDocumentV1,
  cueId: string
): number {
  const submasters = show.submasters ?? [];
  const linkedSubmasterIds = new Set<string>();

  for (const submaster of submasters) {
    if ((submaster.mode ?? 'cue-intensity') !== 'cue-intensity') continue;
    if (submaster.targets?.includes(cueId)) {
      linkedSubmasterIds.add(submaster.id);
    }
  }

  for (const executor of show.executors ?? []) {
    for (const slot of executor.slots ?? []) {
      if (slot.cueId !== cueId || !slot.submasterId) continue;
      linkedSubmasterIds.add(slot.submasterId);
    }
  }

  if (linkedSubmasterIds.size === 0) {
    return 1;
  }

  return [...linkedSubmasterIds].reduce((scale, submasterId) => {
    const submaster = submasters.find((candidate) => candidate.id === submasterId);
    return scale * clampUnit(submaster?.value ?? 1);
  }, 1);
}

export function submasterValue(submaster: ShowSubmaster | undefined): number {
  return clampUnit(submaster?.value ?? 1);
}
