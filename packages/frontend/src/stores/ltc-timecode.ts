/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Decoder } from 'linear-timecode';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useShowStore } from './show';
import { useTimecodeStore } from './timecode';

type LtcChannel = 'left' | 'right' | 'mono';

export const useLtcTimecodeStore = defineStore('ltcTimecode', () => {
  const showStore = useShowStore();
  const timecodeStore = useTimecodeStore();

  const isRunning = ref(false);
  const isSupported = ref(false);
  const lastError = ref<string | null>(null);
  const signalLocked = ref(false);

  let audioContext: AudioContext | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let splitterNode: ChannelSplitterNode | null = null;
  let gainNode: GainNode | null = null;
  let mediaStream: MediaStream | null = null;
  let decoder: InstanceType<typeof Decoder> | null = null;
  let rafId: number | null = null;
  let timeDomainData: Float32Array | null = null;
  let analyserNode: AnalyserNode | null = null;
  let lockTimeoutId: number | null = null;

  const active = computed(
    () => showStore.document.timecode?.enabled === true && showStore.document.timecode?.source === 'ltc'
  );

  function clearLockTimer() {
    if (lockTimeoutId !== null && typeof window !== 'undefined') {
      window.clearTimeout(lockTimeoutId);
    }
    lockTimeoutId = null;
  }

  function markLocked() {
    signalLocked.value = true;
    clearLockTimer();
    if (typeof window !== 'undefined') {
      lockTimeoutId = window.setTimeout(() => {
        signalLocked.value = false;
      }, 1500);
    }
  }

  function stopInternal() {
    if (rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafId);
    }
    rafId = null;

    clearLockTimer();
    signalLocked.value = false;

    sourceNode?.disconnect();
    sourceNode = null;
    splitterNode?.disconnect();
    splitterNode = null;
    gainNode?.disconnect();
    gainNode = null;
    analyserNode?.disconnect();
    analyserNode = null;

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }

    if (decoder) {
      decoder.removeAllListeners('frame');
      decoder = null;
    }

    void audioContext?.close();
    audioContext = null;
    timeDomainData = null;
    isRunning.value = false;
  }

  function decodeLoop() {
    if (!analyserNode || !decoder || !timeDomainData) return;
    rafId = window.requestAnimationFrame(decodeLoop);

    analyserNode.getFloatTimeDomainData(timeDomainData);
    decoder.decode(Array.from(timeDomainData));
  }

  async function start() {
    if (!active.value || isRunning.value) return;
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      isSupported.value = false;
      return;
    }

    isSupported.value = true;
    lastError.value = null;

    const inputDeviceId = showStore.document.timecode?.ltcInputDeviceId ?? null;
    const channel: LtcChannel = showStore.document.timecode?.ltcChannel ?? 'mono';
    const gainValue = showStore.document.timecode?.ltcGain ?? 1;

    try {
      const constraints: MediaStreamConstraints = {
        audio: inputDeviceId
          ? {
              deviceId: { exact: inputDeviceId },
              echoCancellation: false,
              autoGainControl: false,
              noiseSuppression: false,
              channelCount: channel === 'mono' ? 1 : 2,
            }
          : {
              echoCancellation: false,
              autoGainControl: false,
              noiseSuppression: false,
              channelCount: channel === 'mono' ? 1 : 2,
            },
      };

      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      audioContext = new window.AudioContext();
      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      gainNode = audioContext.createGain();
      gainNode.gain.value = gainValue;
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 4096;
      analyserNode.smoothingTimeConstant = 0;

      if (channel === 'mono') {
        sourceNode.connect(gainNode);
      } else {
        splitterNode = audioContext.createChannelSplitter(2);
        sourceNode.connect(splitterNode);
        splitterNode.connect(gainNode, channel === 'left' ? 0 : 1);
      }

      gainNode.connect(analyserNode);
      timeDomainData = new Float32Array(analyserNode.fftSize);

      decoder = new Decoder(audioContext.sampleRate);
      decoder.on(
        'frame',
        (frame: { hours: number; minutes: number; seconds: number; frames: number; framerate?: number }) => {
          markLocked();
          if (typeof frame.framerate === 'number' && frame.framerate > 0) {
            timecodeStore.setDetectedFps(frame.framerate);
          }
          timecodeStore.setSmpte(frame.hours, frame.minutes, frame.seconds, frame.frames, 'ltc');
        }
      );

      isRunning.value = true;
      rafId = window.requestAnimationFrame(decodeLoop);
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Unable to start LTC input';
      stopInternal();
    }
  }

  function stop() {
    stopInternal();
  }

  async function restartIfNeeded() {
    if (!active.value) {
      stop();
      return;
    }
    stop();
    await start();
  }

  watch(
    () => [
      showStore.document.timecode?.enabled,
      showStore.document.timecode?.source,
      showStore.document.timecode?.ltcInputDeviceId,
      showStore.document.timecode?.ltcChannel,
      showStore.document.timecode?.ltcGain,
    ],
    () => {
      void restartIfNeeded();
    },
    { deep: true }
  );

  return {
    active,
    isRunning,
    isSupported,
    lastError,
    signalLocked,
    start,
    stop,
    restartIfNeeded,
  };
});
