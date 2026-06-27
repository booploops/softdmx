/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { TimelineTrack } from '@softdmx/engine';

export type TimelineConflict = {
  trackId: string;
  trackName: string;
  clipAId: string;
  clipBId: string;
  overlapStartSec: number;
  overlapEndSec: number;
};

export function detectTimelineConflicts(tracks: TimelineTrack[]): TimelineConflict[] {
  const conflicts: TimelineConflict[] = [];
  for (const track of tracks) {
    if (track.kind !== 'cue' || track.enabled === false || track.clips.length < 2) continue;
    const clips = [...track.clips].sort((a, b) => a.startSec - b.startSec || a.endSec - b.endSec);
    for (let i = 0; i < clips.length; i += 1) {
      const left = clips[i]!;
      for (let j = i + 1; j < clips.length; j += 1) {
        const right = clips[j]!;
        if (right.startSec >= left.endSec) break;
        const overlapStartSec = Math.max(left.startSec, right.startSec);
        const overlapEndSec = Math.min(left.endSec, right.endSec);
        if (overlapEndSec <= overlapStartSec) continue;
        conflicts.push({
          trackId: track.id,
          trackName: track.name,
          clipAId: left.id,
          clipBId: right.id,
          overlapStartSec,
          overlapEndSec,
        });
      }
    }
  }
  return conflicts;
}
