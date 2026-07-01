/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed } from 'vue';
import type { ScratchConflict } from '@softdmx/engine';
import { mergeClientScratchLayers } from '@softdmx/engine';
import { useScratchStore } from 'src/stores/scratch';
import { useProgrammerStore } from 'src/stores/programmer';
import { useOutputPlaybackStore } from 'src/stores/output-playback';
import { useClientIdentityStore } from 'src/stores/client-identity';
import { useIOClient } from 'src/lib/io-client';

export function useScratchConflicts() {
  const scratch = useScratchStore();
  const programmer = useProgrammerStore();
  const output = useOutputPlaybackStore();
  const identity = useClientIdentityStore();
  const socket = useIOClient();

  const conflicts = computed<ScratchConflict[]>(() => {
    if (output.lastScratchConflicts.length > 0) {
      return output.lastScratchConflicts;
    }
    if (scratch.clientLayers.length === 0) return [];
    return mergeClientScratchLayers(scratch.clientLayers, programmer.conflictMode).conflicts;
  });

  const conflictPaths = computed(() => new Set(conflicts.value.map((conflict) => conflict.path)));

  function isConflictPath(path: string): boolean {
    return conflictPaths.value.has(path);
  }

  function resolveAcceptMine(conflict: ScratchConflict) {
    const mine = conflict.clients.find((client) => client.clientId === identity.clientId);
    if (!mine) return;
    socket.emit('scratch:set', {
      clientId: identity.clientId,
      path: conflict.path,
      value: mine.value,
      attributeType: conflict.attributeType,
    });
  }

  function resolveAcceptTheirs(conflict: ScratchConflict) {
    const others = conflict.clients.filter((client) => client.clientId !== identity.clientId);
    const winner = [...others].sort((a, b) => (b.seq ?? 0) - (a.seq ?? 0))[0];
    if (!winner) return;
    socket.emit('scratch:set', {
      clientId: identity.clientId,
      path: conflict.path,
      value: winner.value,
      attributeType: conflict.attributeType,
    });
  }

  function resolveUseMerged(conflict: ScratchConflict) {
    if (conflict.mergedValue === undefined) return;
    socket.emit('scratch:set', {
      clientId: identity.clientId,
      path: conflict.path,
      value: conflict.mergedValue,
      attributeType: conflict.attributeType,
    });
  }

  return {
    conflicts,
    conflictPaths,
    isConflictPath,
    resolveAcceptMine,
    resolveAcceptTheirs,
    resolveUseMerged,
  };
}
