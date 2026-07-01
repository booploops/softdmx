/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ScratchClientLayer, ScratchConflict, ScratchEntry } from '@softdmx/engine';
import { clientLayersToSingleEntries, mergeClientScratchLayers } from '@softdmx/engine';

export interface ScratchEntryChange {
  path: string;
  before?: number;
  after: number;
  clientId?: string;
}

export interface ScratchDiffResult {
  added: ScratchEntry[];
  removed: string[];
  changed: ScratchEntryChange[];
  conflicts: ScratchConflict[];
  mergedBefore: ScratchEntry[];
  mergedAfter: ScratchEntry[];
}

function entriesByPath(entries: ScratchEntry[]): Map<string, ScratchEntry> {
  return new Map(entries.map((entry) => [entry.path, entry]));
}

export function diffScratchEntries(before: ScratchEntry[], after: ScratchEntry[]): Omit<ScratchDiffResult, 'conflicts' | 'mergedBefore' | 'mergedAfter'> {
  const beforeMap = entriesByPath(before);
  const afterMap = entriesByPath(after);
  const added: ScratchEntry[] = [];
  const removed: string[] = [];
  const changed: ScratchEntryChange[] = [];

  for (const [path, entry] of afterMap) {
    const previous = beforeMap.get(path);
    if (!previous) {
      added.push(entry);
      continue;
    }
    if (previous.value !== entry.value) {
      changed.push({
        path,
        before: previous.value,
        after: entry.value,
        clientId: entry.clientId ?? previous.clientId,
      });
    }
  }

  for (const path of beforeMap.keys()) {
    if (!afterMap.has(path)) {
      removed.push(path);
    }
  }

  return { added, removed, changed };
}

export function diffClientLayers(
  before: ScratchClientLayer[],
  after: ScratchClientLayer[],
  conflictMode: 'attribute-merge' | 'last-writer' | 'operator-priority' = 'attribute-merge',
): ScratchDiffResult {
  const mergedBefore = clientLayersToSingleEntries(before);
  const mergedAfter = clientLayersToSingleEntries(after);
  const { conflicts } = mergeClientScratchLayers(after, conflictMode);
  const baseDiff = diffScratchEntries(mergedBefore, mergedAfter);

  return {
    ...baseDiff,
    conflicts,
    mergedBefore,
    mergedAfter,
  };
}
