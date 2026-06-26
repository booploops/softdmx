/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useIOClient } from 'src/lib/io-client';
import { recordRuntimeMetric } from 'src/utils/runtime-metrics';
import { getRuntimeOptimizationFlags } from 'src/config/runtime-optimization-flags';
import AudioAnalysisWorker from 'src/workers/audio-analysis.worker.ts?worker';

const TARGET_FRAME_MS = 1000 / 30;
const BAND_LIMITS_HZ = [20, 60, 250, 2000, 8000];

type AudioBandLevels = [number, number, number, number];

export interface AudioLevels {
  rms: number;
  peak: number;
  bands: AudioBandLevels;
}

export const useAudioStore = defineStore('audio', () => {
  const enabled = ref(false);
  const selectedDeviceId = ref<string | null>(null);
  const gain = ref(1);
  const levels = ref<AudioLevels>({
    rms: 0,
    peak: 0,
    bands: [0, 0, 0, 0],
  });
  const beatPulse = ref(false);
  const isSupported = ref(false);
  const devices = ref<MediaDeviceInfo[]>([]);

  let audioContext: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let gainNode: GainNode | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let mediaStream: MediaStream | null = null;
  let timeDomainData: Float32Array | null = null;
  let frequencyData: Float32Array | null = null;
  let rafId: number | null = null;
  let lastFrameTs = 0;
  let smoothedEnergy = 0;
  let beatPulseTimeoutId: number | null = null;
  let analysisWorker: Worker | null = null;
  let analysisRequestId = 0;

  const canEnumerateDevices = computed(
    () => typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.enumerateDevices === 'function'
  );

  function resetLevels() {
    levels.value = {
      rms: 0,
      peak: 0,
      bands: [0, 0, 0, 0],
    };
    beatPulse.value = false;
  }

  function clearBeatPulseTimer() {
    if (beatPulseTimeoutId !== null && typeof window !== 'undefined') {
      window.clearTimeout(beatPulseTimeoutId);
    }
    beatPulseTimeoutId = null;
  }

  async function refreshDevices() {
    if (!canEnumerateDevices.value) {
      devices.value = [];
      return;
    }

    const allDevices = await navigator.mediaDevices.enumerateDevices();
    devices.value = allDevices.filter((device) => device.kind === 'audioinput');

    if (!selectedDeviceId.value && devices.value.length > 0) {
      selectedDeviceId.value = devices.value[0]?.deviceId ?? null;
    }
  }

  function stopInternal() {
    if (rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    clearBeatPulseTimer();
    if (analysisWorker) {
      analysisWorker.terminate();
      analysisWorker = null;
    }

    sourceNode?.disconnect();
    sourceNode = null;

    gainNode?.disconnect();
    gainNode = null;

    analyserNode?.disconnect();
    analyserNode = null;

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }

    void audioContext?.close();
    audioContext = null;
    timeDomainData = null;
    frequencyData = null;
    smoothedEnergy = 0;
    lastFrameTs = 0;
    resetLevels();
  }

  function normalizeDb(dbValue: number, minDb: number, maxDb: number) {
    if (!Number.isFinite(dbValue)) return 0;
    const clamped = Math.min(maxDb, Math.max(minDb, dbValue));
    return (clamped - minDb) / (maxDb - minDb);
  }

  function avgRange(arr: Float32Array, startIndex: number, endIndex: number) {
    if (endIndex <= startIndex) return 0;
    let sum = 0;
    for (let i = startIndex; i < endIndex; i += 1) {
      sum += arr[i] ?? 0;
    }
    return sum / (endIndex - startIndex);
  }

  function toBandIndex(hz: number, sampleRate: number, fftSize: number) {
    const nyquist = sampleRate / 2;
    const normalized = Math.max(0, Math.min(1, hz / nyquist));
    return Math.floor(normalized * (fftSize / 2));
  }

  function emitMeters() {
    useIOClient().emit('audio:meters', {
      rms: levels.value.rms,
      peak: levels.value.peak,
      bands: [...levels.value.bands],
      beatPulse: beatPulse.value,
      ts: Date.now(),
    });
  }

  function triggerBeatPulse() {
    beatPulse.value = true;
    clearBeatPulseTimer();
    if (typeof window !== 'undefined') {
      beatPulseTimeoutId = window.setTimeout(() => {
        beatPulse.value = false;
      }, 90);
    }
  }

  function analysisLoop(ts: number) {
    if (!analyserNode || !timeDomainData || !frequencyData) return;

    rafId = window.requestAnimationFrame(analysisLoop);
    if (ts - lastFrameTs < TARGET_FRAME_MS) return;
    lastFrameTs = ts;

    const startedAt = performance.now();
    analyserNode.getFloatTimeDomainData(timeDomainData);
    analyserNode.getFloatFrequencyData(frequencyData);

    if (getRuntimeOptimizationFlags().audioAnalysisWorkerEnabled) {
      const worker = ensureAnalysisWorker();
      const requestId = ++analysisRequestId;
      worker.postMessage({
        type: 'analyze',
        requestId,
        timeDomainData: Array.from(timeDomainData),
        frequencyData: Array.from(frequencyData),
        minDb: analyserNode.minDecibels,
        maxDb: analyserNode.maxDecibels,
        sampleRate: audioContext?.sampleRate ?? 48000,
        fftSize: analyserNode.fftSize,
      });
    } else {
      applyMainThreadAnalysis(analyserNode, timeDomainData, frequencyData);
    }

    recordRuntimeMetric('audio.analysis.loop', performance.now() - startedAt);
  }

  function applyMainThreadAnalysis(
    analyserNode: AnalyserNode,
    timeDomainData: Float32Array,
    frequencyData: Float32Array
  ) {
    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < timeDomainData.length; i += 1) {
      const sample = timeDomainData[i] ?? 0;
      const abs = Math.abs(sample);
      sumSquares += sample * sample;
      if (abs > peak) peak = abs;
    }

    const rms = Math.sqrt(sumSquares / timeDomainData.length);
    const minDb = analyserNode.minDecibels;
    const maxDb = analyserNode.maxDecibels;
    const sampleRate = audioContext?.sampleRate ?? 48000;

    const bands: AudioBandLevels = [0, 0, 0, 0];
    for (let i = 0; i < 4; i += 1) {
      const startHz = BAND_LIMITS_HZ[i] ?? 0;
      const endHz = BAND_LIMITS_HZ[i + 1] ?? 0;
      const startIndex = toBandIndex(startHz, sampleRate, analyserNode.fftSize);
      const endIndex = toBandIndex(endHz, sampleRate, analyserNode.fftSize);
      const avgDb = avgRange(frequencyData, startIndex, endIndex);
      bands[i] = normalizeDb(avgDb, minDb, maxDb);
    }

    const lowEnergy = (bands[0] + bands[1]) * 0.5;
    smoothedEnergy = smoothedEnergy * 0.86 + lowEnergy * 0.14;
    const onset = lowEnergy - smoothedEnergy;
    if (onset > 0.15 && lowEnergy > 0.2) {
      triggerBeatPulse();
    }

    levels.value = {
      rms: Math.min(1, rms),
      peak: Math.min(1, peak),
      bands,
    };
    emitMeters();
  }

  function ensureAnalysisWorker(): Worker {
    if (analysisWorker) return analysisWorker;
    analysisWorker = new AudioAnalysisWorker();
    analysisWorker.onmessage = (event) => {
      const message = event.data as {
        type: 'analyzed';
        requestId: number;
        rms: number;
        peak: number;
        bands: AudioBandLevels;
        beatPulse: boolean;
      };
      if (message.type !== 'analyzed') return;
      if (message.requestId !== analysisRequestId) return;
      if (message.beatPulse) {
        triggerBeatPulse();
      }
      levels.value = {
        rms: message.rms,
        peak: message.peak,
        bands: message.bands,
      };
      emitMeters();
    };
    return analysisWorker;
  }

  async function start() {
    if (!isSupported.value || mediaStream) return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId.value
          ? {
              deviceId: { exact: selectedDeviceId.value },
              echoCancellation: false,
              autoGainControl: false,
              noiseSuppression: false,
            }
          : {
              echoCancellation: false,
              autoGainControl: false,
              noiseSuppression: false,
            },
      };

      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      await refreshDevices();

      audioContext = new window.AudioContext();
      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      gainNode = audioContext.createGain();
      gainNode.gain.value = gain.value;

      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.6;
      analyserNode.minDecibels = -95;
      analyserNode.maxDecibels = -20;

      sourceNode.connect(gainNode);
      gainNode.connect(analyserNode);

      timeDomainData = new Float32Array(analyserNode.fftSize);
      frequencyData = new Float32Array(analyserNode.frequencyBinCount);

      lastFrameTs = 0;
      rafId = window.requestAnimationFrame(analysisLoop);
    } catch (err) {
      console.error('Unable to start audio capture', err);
      enabled.value = false;
      stopInternal();
    }
  }

  function stop() {
    stopInternal();
  }

  async function init() {
    isSupported.value =
      typeof window !== 'undefined' &&
      typeof window.AudioContext !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function';

    if (!isSupported.value) return;

    await refreshDevices();
    navigator.mediaDevices.addEventListener('devicechange', () => {
      void refreshDevices();
    });
  }

  watch(enabled, (isOn) => {
    if (isOn) {
      void start();
    } else {
      stop();
    }
  });

  watch(selectedDeviceId, (nextId, prevId) => {
    if (!enabled.value || !mediaStream || nextId === prevId) return;
    stop();
    void start();
  });

  watch(gain, (nextGain) => {
    if (gainNode) {
      gainNode.gain.value = nextGain;
    }
  });

  return {
    enabled,
    selectedDeviceId,
    gain,
    levels,
    beatPulse,
    isSupported,
    devices,
    init,
    start,
    stop,
    refreshDevices,
  };
});
