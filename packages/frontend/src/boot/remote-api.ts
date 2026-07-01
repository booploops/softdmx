/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar';
import { useIOClient } from 'src/lib/io-client';
import { useScratchStore } from 'src/stores/scratch';
import { useOutputEngineStore } from 'src/stores/output-playback';
import { useCueStore } from 'src/stores/cue';
import { useExecutorStore } from 'src/stores/executor';
import { useShowStore } from 'src/stores/show';
import { useAudioStore } from 'src/stores/audio';
import { useProgrammerSessionStore } from 'src/stores/programmer-session';
import type { ProgrammerSession, ShowAudioMapping, ShowDocument } from '@softdmx/engine';
import { isSupportedShowVersion } from '@softdmx/engine';
import type { ScratchConflict } from '@softdmx/engine';

export default boot(() => {
  const socket = useIOClient();
  const scratch = useScratchStore();
  const engine = useOutputEngineStore();
  const cueStore = useCueStore();
  const executorStore = useExecutorStore();
  const showStore = useShowStore();
  const audioStore = useAudioStore();
  const sessionStore = useProgrammerSessionStore();
  let pendingRemoteShow: ShowDocument | null = null;
  let dismissConflictNotice: (() => void) | null = null;
  let lastScratchSeq = 0;

  function cloneValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function parseModifiedTimestamp(value: string | undefined): number {
    const parsed = Date.parse(value ?? '');
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function applySimpleRemoteMerge(remoteShow: ShowDocument) {
    showStore.updateDocument((doc) => {
      doc.meta.name = remoteShow.meta.name;
      doc.destinations = cloneValue(remoteShow.destinations ?? []);
      doc.audio = remoteShow.audio ? cloneValue(remoteShow.audio) : undefined;
      doc.plugins = cloneValue(remoteShow.plugins ?? []);
    });
  }

  function dismissShowConflictNotice() {
    if (dismissConflictNotice) {
      dismissConflictNotice();
      dismissConflictNotice = null;
    }
  }

  function promptRemoteConflict(remoteShow: ShowDocument) {
    pendingRemoteShow = remoteShow;
    dismissShowConflictNotice();

    dismissConflictNotice = Notify.create({
      type: 'warning',
      timeout: 0,
      message: 'Show updated on another client.',
      caption: 'Reload full show or merge simple settings fields.',
      actions: [
        {
          label: 'Reload',
          color: 'white',
          handler: () => {
            if (!pendingRemoteShow) return;
            showStore.loadShow(pendingRemoteShow, { sync: false });
            pendingRemoteShow = null;
            dismissShowConflictNotice();
          },
        },
        {
          label: 'Merge Basic',
          color: 'white',
          handler: () => {
            if (!pendingRemoteShow) return;
            applySimpleRemoteMerge(pendingRemoteShow);
            pendingRemoteShow = null;
            dismissShowConflictNotice();
          },
        },
        {
          label: 'Dismiss',
          color: 'white',
          handler: () => {
            pendingRemoteShow = null;
            dismissShowConflictNotice();
          },
        },
      ],
    });
  }

  socket.on('remote:scratch:clear', () => {
    scratch.clear();
    engine.requestMerge();
  });

  socket.on(
    'scratch:layers',
    (snapshot: { seq?: number; merged?: import('@softdmx/engine').ScratchEntry[]; conflicts?: ScratchConflict[] }) => {
      if (typeof snapshot?.seq === 'number' && snapshot.seq < lastScratchSeq) {
        return;
      }
      if (typeof snapshot?.seq === 'number') {
        lastScratchSeq = snapshot.seq;
      }
      if (Array.isArray(snapshot?.merged)) {
        scratch.setEntries(snapshot.merged);
        engine.requestMerge();
      }
      if (snapshot?.conflicts?.length) {
        console.info(`Scratch conflicts: ${snapshot.conflicts.length}`);
      }
    },
  );

  socket.on('scratch:conflicts', (conflicts: ScratchConflict[]) => {
    if (!Array.isArray(conflicts) || conflicts.length === 0) return;
    console.info(`Scratch conflicts updated: ${conflicts.length}`);
  });

  socket.on('programmer-session:arm', (payload: { sessionId?: string; clock?: ProgrammerSession['clock'] }) => {
    sessionStore.arm({
      sessionId: payload?.sessionId,
      clock: payload?.clock,
    });
  });

  socket.on('programmer-session:disarm', (payload?: { persist?: boolean }) => {
    sessionStore.disarm({ persist: payload?.persist !== false });
  });

  socket.on('remote:scratch:set', (payload: { path: string; value: number; attributeType?: string } | { channels: { path: string; value: number; attributeType?: string }[] }) => {
    if ('channels' in payload && Array.isArray(payload.channels)) {
      for (const ch of payload.channels) {
        scratch.setChannel(ch.path, ch.value, ch.attributeType ?? 'generic');
      }
    } else if ('path' in payload) {
      scratch.setChannel(payload.path, payload.value, payload.attributeType ?? 'generic');
    }
    engine.requestMerge();
  });

  socket.on('remote:preset:fire', (payload: { presetId: string; fade?: number }) => {
    engine.firePreset(payload.presetId, payload.fade ?? 0);
  });

  socket.on('remote:cue:play', (payload: { cueId: string }) => {
    cueStore.playCue(payload.cueId);
  });

  socket.on('remote:cue:stop', (payload: { cueId: string }) => {
    cueStore.stopCue(payload.cueId);
  });

  socket.on('remote:cue:stack:go', (payload: { cueId: string }) => {
    cueStore.stackGo(payload.cueId);
  });

  socket.on('remote:blackout', (payload: boolean) => {
    engine.setBlackout(!!payload);
  });

  socket.on('remote:grandmaster', (payload: number) => {
    engine.setGrandMaster(payload, { flush: true });
  });

  socket.on('remote:playbackbus', (payload: number) => {
    engine.setPlaybackBusMaster(payload, { flush: true });
  });

  socket.on('remote:executor:trigger', (payload: { slotId: string }) => {
    if (payload?.slotId) executorStore.triggerSlot(payload.slotId);
  });

  socket.on('remote:effect:set', (payload: { effectId: string; enabled: boolean }) => {
    showStore.updateDocument((doc) => {
      const effect = doc.effects.find((e) => e.id === payload.effectId);
      if (effect) effect.enabled = payload.enabled;
    });
    engine.requestMerge();
  });

  socket.on('remote:audio:setEnabled', (payload: { enabled: boolean }) => {
    showStore.updateDocument((doc) => {
      doc.audio = {
        ...(doc.audio ?? {}),
        enabled: payload.enabled,
      };
    });
    audioStore.enabled = payload.enabled;
    engine.requestMerge();
  });

  socket.on('remote:audio:mappings:create', (payload: { mapping: ShowAudioMapping }) => {
    showStore.updateDocument((doc) => {
      if (!doc.audioMappings) doc.audioMappings = [];
      const existing = doc.audioMappings.find((mapping) => mapping.id === payload.mapping.id);
      if (existing) {
        Object.assign(existing, payload.mapping);
      } else {
        doc.audioMappings.push(payload.mapping);
      }
    });
    engine.requestMerge();
  });

  socket.on('remote:audio:mappings:update', (payload: { id: string; mapping: Partial<ShowAudioMapping> }) => {
    showStore.updateDocument((doc) => {
      const existing = doc.audioMappings?.find((mapping) => mapping.id === payload.id);
      if (existing) {
        Object.assign(existing, payload.mapping);
      }
    });
    engine.requestMerge();
  });

  socket.on('remote:audio:mappings:delete', (payload: { id: string }) => {
    showStore.updateDocument((doc) => {
      doc.audioMappings = (doc.audioMappings ?? []).filter((mapping) => mapping.id !== payload.id);
    });
    engine.requestMerge();
  });

  // Only apply show updates from other clients (remote control / second window).
  // The local client already owns its show document; reloading on our own emits
  // causes an infinite load → emit → load loop that freezes the renderer.
  socket.on('show:state', (show) => {
    if (!isSupportedShowVersion(show?.version)) return;

    const incomingShow = show as ShowDocument;
    const remoteModified = parseModifiedTimestamp(incomingShow.meta.modified);
    const localModified = parseModifiedTimestamp(showStore.document.meta.modified);
    if (remoteModified <= localModified) return;

    if (!showStore.isDirty) {
      dismissShowConflictNotice();
      pendingRemoteShow = null;
      showStore.loadShow(incomingShow, { sync: false });
      return;
    }

    promptRemoteConflict(incomingShow);
  });
});
