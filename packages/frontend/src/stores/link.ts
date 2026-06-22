/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useShowStore } from './show';
import { useOutputEngineStore } from './output-playback';
import { compensateLinkPhase } from '@softdmx/engine';

export const useLinkStore = defineStore('link', () => {
  const isEnabled = ref(false);
  const bpm = ref(120.0);
  const currentBeat = ref(0);
  const currentPhase = ref(0.0);
  const numPeers = ref(0);

  // Callbacks registered to trigger on every beat crossing
  const beatCallbacks = new Set<() => void>();

  function toggleLink(val: boolean) {
    isEnabled.value = val;
    if (window.electronLink) {
      window.electronLink.setEnabled(val);
    }
  }

  function updateBpm(val: number) {
    bpm.value = val;
    if (window.electronLink) {
      window.electronLink.setBpm(val);
    }
  }

  function addBeatListener(cb: () => void) {
    beatCallbacks.add(cb);
  }

  function removeBeatListener(cb: () => void) {
    beatCallbacks.delete(cb);
  }

  function initLink() {
    if (window.electronLink) {
      window.electronLink.onTick((event, data) => {
        if (!data) return;

        bpm.value = data.bpm;
        const linkConfig = useShowStore().document.link;
        currentPhase.value = compensateLinkPhase(data.beat, data.phase, data.bpm, linkConfig);
        currentBeat.value = Math.floor(data.beat);
        numPeers.value = data.numPeers;

        try {
          useOutputEngineStore().updateLinkPhase(data.phase);
        } catch {
          // store may not be ready during early boot
        }

        if (data.isNewBeat) {
          beatCallbacks.forEach((cb) => {
            try {
              cb();
            } catch (err) {
              console.error('Error in Ableton Link beat callback:', err);
            }
          });
        }
      });

      window.electronLink.onPeersChanged((event, peersCount) => {
        numPeers.value = peersCount;
      });
    }
  }

  return {
    isEnabled,
    bpm,
    currentBeat,
    currentPhase,
    numPeers,
    toggleLink,
    updateBpm,
    addBeatListener,
    removeBeatListener,
    initLink,
  };
});
