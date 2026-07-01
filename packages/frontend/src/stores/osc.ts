/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  type BindingTarget,
  type OscMapping,
  parseDirectOscAddress,
  parseOscValue,
  applyOscMediaCompensation,
} from '@softdmx/engine';
import { useShowStore } from './show';
import { useCueStore } from './cue';
import { useOutputEngineStore } from './output-playback';
import { useTimecodeStore } from './timecode';
import { useScratchStore } from './scratch';
import { useChannelControl } from 'src/composables/useChannelControl';

const OSC_EMIT_SCRATCH_CHANGED_KEY = 'softdmx.osc_emit_scratch_changed';

export const useOscStore = defineStore('osc', () => {
  const showStore = useShowStore();
  const cueStore = useCueStore();
  const engine = useOutputEngineStore();
  const timecodeStore = useTimecodeStore();
  const scratch = useScratchStore();
  const channelControl = useChannelControl();

  const isLearning = ref(false);
  const activeLearnTarget = ref<BindingTarget | null>(null);
  const oscPort = ref(8000);
  const mediaTime = ref(0);
  const mediaTimeAddress = ref<string | null>(null);
  const mediaCueHook = ref<{ cueId: string; triggerAtSec: number } | null>(null);
  const mediaCueHookTriggered = ref(false);

  const mappings = computed(() => showStore.document.bindings.osc);

  function parseMediaTime(address: string, args: unknown[]): number | null {
    const lowerAddress = address.toLowerCase();
    const numericArgs = args
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (numericArgs.length === 0) return null;

    const softdmxPattern = lowerAddress === '/softdmx/media/time';
    const resolumeTimePattern =
      lowerAddress.endsWith('/time') ||
      lowerAddress.includes('/composition/time') ||
      /\/layer\d+\/(clip|video)\/time$/.test(lowerAddress) ||
      /\/clip\d+\/time$/.test(lowerAddress);

    if (!softdmxPattern && !resolumeTimePattern) return null;

    const first = numericArgs[0] ?? 0;
    const second = numericArgs[1];

    // Many clients send normalized progress (0-1) and duration as second arg.
    if (typeof second === 'number' && second > 0 && first >= 0 && first <= 1) {
      return first * second;
    }

    return first;
  }

  function updateMediaTime(nextMediaTime: number, sourceAddress: string) {
    const previous = mediaTime.value;
    const compensated = applyOscMediaCompensation(nextMediaTime, showStore.document.oscSync);
    mediaTime.value = compensated;
    mediaTimeAddress.value = sourceAddress;

    const hook = mediaCueHook.value;
    if (!hook) return;

    if (mediaTime.value < hook.triggerAtSec) {
      mediaCueHookTriggered.value = false;
      return;
    }

    if (!mediaCueHookTriggered.value && previous < hook.triggerAtSec) {
      cueStore.playCue(hook.cueId);
      mediaCueHookTriggered.value = true;
    }
  }

  function isScratchChangedEmitEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(OSC_EMIT_SCRATCH_CHANGED_KEY) === '1';
  }

  function emitScratchChanged(path: string, value: number) {
    if (!isScratchChangedEmitEnabled()) return;
    window.electronAPI?.sendOsc?.('/softdmx/scratch/changed', [path, value]);
  }

  function applyTarget(target: BindingTarget, valueArg: unknown) {
    const value = parseOscValue(valueArg);

    switch (target.type) {
      case 'fixture_channel': {
        const { fixtureName, channelIndex } = target;
        if (fixtureName && channelIndex !== undefined) {
          channelControl.setChannelByFixture(fixtureName, channelIndex, value);
          const mappedPath = `show://${fixtureName}/${channelIndex + 1}`;
          emitScratchChanged(mappedPath, value);
        }
        break;
      }
      case 'group_master': {
        if (target.groupName) {
          channelControl.setGroupChannels(target.groupName, { Dimmer: value });
        }
        break;
      }
      case 'cue_trigger': {
        if (!target.cueId) break;
        if (value > 0) cueStore.playCue(target.cueId);
        else cueStore.stopCue(target.cueId);
        break;
      }
      case 'cue_stack_go': {
        if (target.cueId && value > 0) cueStore.stackGo(target.cueId);
        break;
      }
      case 'preset': {
        if (target.presetId && value > 0) cueStore.firePreset(target.presetId, 1000);
        break;
      }
      case 'blackout':
        engine.setBlackout(value > 0);
        break;
      case 'grandmaster':
        engine.setGrandMaster(value / 255);
        break;
    }
  }

  function handleIncomingOsc(address: string, args: unknown[]) {
    timecodeStore.applyOscTimecode(address, args);

    const parsedMediaTime = parseMediaTime(address, args);
    if (parsedMediaTime !== null) {
      updateMediaTime(parsedMediaTime, address);
    }

    if (isLearning.value && activeLearnTarget.value) {
      const target = { ...activeLearnTarget.value };
      showStore.updateDocument((doc) => {
        doc.bindings.osc = doc.bindings.osc.filter(
          (m) => JSON.stringify(m.target) !== JSON.stringify(target)
        );
        doc.bindings.osc.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          addressPattern: address,
          target,
        });
      });
      isLearning.value = false;
      activeLearnTarget.value = null;
      return;
    }

    const parsedDirect = parseDirectOscAddress(address);
    if (parsedDirect) {
      if (parsedDirect.type === 'cue_trigger' && parsedDirect.action === 'go' && parsedDirect.cueId) {
        applyTarget({ type: 'cue_stack_go', cueId: parsedDirect.cueId }, args[0]);
        return;
      }
      applyTarget(parsedDirect as BindingTarget, args[0]);
      return;
    }

    mappings.value
      .filter((m) => m.addressPattern === address)
      .forEach((m) => applyTarget(m.target, args[0]));
  }

  function startLearning(target: OscMapping['target']) {
    isLearning.value = true;
    activeLearnTarget.value = target;
  }

  function stopLearning() {
    isLearning.value = false;
    activeLearnTarget.value = null;
  }

  function initOsc() {
    window.electronAPI?.onOscMessage((_event, data) => {
      if (data?.address) handleIncomingOsc(data.address, data.args);
    });
  }

  function setMediaCueHook(cueId: string, triggerAtSec = 0) {
    mediaCueHook.value = {
      cueId,
      triggerAtSec: Math.max(0, triggerAtSec),
    };
    mediaCueHookTriggered.value = false;
  }

  function clearMediaCueHook() {
    mediaCueHook.value = null;
    mediaCueHookTriggered.value = false;
  }

  return {
    mappings,
    isLearning,
    activeLearnTarget,
    oscPort,
    mediaTime,
    mediaTimeAddress,
    mediaCueHook,
    handleIncomingOsc,
    startLearning,
    stopLearning,
    setMediaCueHook,
    clearMediaCueHook,
    initOsc,
  };
});
