/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { BindingTarget } from '@softdmx/engine';
import { useShowStore } from './show';
import { useCueStore } from './cue';
import { useOutputEngineStore } from './output-playback';
import { useChannelControl } from 'src/composables/useChannelControl';
import { useTimecodeStore } from './timecode';
import MidiParserWorker from '../workers/midi-parser.worker.ts?worker';

import type { MidiWorkerResponse } from '../workers/midi-parser.worker.ts';

export const useMidiStore = defineStore('midi', () => {
  const showStore = useShowStore();
  const cueStore = useCueStore();
  const engine = useOutputEngineStore();
  const channelControl = useChannelControl();

  const isLearning = ref(false);
  const activeLearnTarget = ref<BindingTarget | null>(null);
  const isMidiSupported = ref(false);

  let worker: Worker | null = null;

  const mappings = computed(() => showStore.document.bindings.midi);

  function findCueIdByToken(token?: string): string | null {
    if (!token) return null;
    const byId = showStore.document.cues.find((cue) => cue.id === token);
    if (byId) return byId.id;
    const byName = showStore.document.cues.find((cue) => cue.name === token);
    if (byName) return byName.id;
    return null;
  }

  function applyTarget(target: BindingTarget, value: number) {
    switch (target.type) {
      case 'fixture_channel': {
        const { fixtureName, channelIndex } = target;
        if (fixtureName && channelIndex !== undefined) {
          channelControl.setChannelByFixture(fixtureName, channelIndex, value);
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

  function initWorker() {
    if (worker) return;
    worker = new MidiParserWorker();
    worker.onmessage = (e: MessageEvent<MidiWorkerResponse>) => {
      const msg = e.data;
      if (!msg) return;

      if (msg.type === 'mtc') {
        const { frame } = msg;
        useTimecodeStore().applyMtcFrame(
          frame.hours,
          frame.minutes,
          frame.seconds,
          frame.frames,
          frame.frameRate
        );
      } else if (msg.type === 'msc') {
        const cueId = findCueIdByToken(msg.cueNumber);
        if (msg.command === 'go' || msg.command === 'cue') {
          if (cueId) cueStore.playCue(cueId);
        } else if (msg.command === 'stop') {
          if (cueId) cueStore.stopCue(cueId);
          else cueStore.stopAllCues();
        }
      } else if (msg.type === 'message') {
        const { channel, controlType, control, targetValue } = msg;

        if (isLearning.value && activeLearnTarget.value) {
          const target = { ...activeLearnTarget.value };
          showStore.updateDocument((doc) => {
            doc.bindings.midi = doc.bindings.midi.filter(
              (m) => JSON.stringify(m.target) !== JSON.stringify(target)
            );
            doc.bindings.midi.push({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              channel,
              controlType,
              controlNumber: control,
              target,
            });
          });
          isLearning.value = false;
          activeLearnTarget.value = null;
          return;
        }

        mappings.value
          .filter((m) => m.channel === channel && m.controlType === controlType && m.controlNumber === control)
          .forEach((m) => applyTarget(m.target, targetValue));
      }
    };
  }

  function handleMidiInput(data: Uint8Array | number[]) {
    if (!worker) {
      initWorker();
    }
    worker.postMessage({ data });
  }

  function startLearning(target: BindingTarget) {
    isLearning.value = true;
    activeLearnTarget.value = target;
  }

  function stopLearning() {
    isLearning.value = false;
    activeLearnTarget.value = null;
  }

  async function initMidi() {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      isMidiSupported.value = false;
      return;
    }

    try {
      const midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      isMidiSupported.value = true;

      const bindInput = (input: MIDIInput) => {
        input.onmidimessage = (event) => {
          if (event.data) handleMidiInput(event.data);
        };
      };

      for (const input of midiAccess.inputs.values()) bindInput(input);
      midiAccess.onstatechange = (event) => {
        if (event.port?.type === 'input' && event.port.state === 'connected') {
          bindInput(event.port as MIDIInput);
        }
      };
    } catch {
      isMidiSupported.value = false;
    }
  }

  return {
    mappings,
    isLearning,
    activeLearnTarget,
    isMidiSupported,
    handleMidiInput,
    startLearning,
    stopLearning,
    initMidi,
  };
});
