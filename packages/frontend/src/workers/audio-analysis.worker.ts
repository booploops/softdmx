/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

type AnalyzeRequest = {
  type: "analyze";
  requestId: number;
  timeDomainData: number[];
  frequencyData: number[];
  minDb: number;
  maxDb: number;
  sampleRate: number;
  fftSize: number;
};

type AnalyzeResponse = {
  type: "analyzed";
  requestId: number;
  rms: number;
  peak: number;
  bands: [number, number, number, number];
  beatPulse: boolean;
};

const BAND_LIMITS_HZ = [20, 60, 250, 2000, 8000];
let smoothedEnergy = 0;

function normalizeDb(dbValue: number, minDb: number, maxDb: number) {
  if (!Number.isFinite(dbValue)) return 0;
  const clamped = Math.min(maxDb, Math.max(minDb, dbValue));
  return (clamped - minDb) / (maxDb - minDb);
}

function avgRange(arr: number[], startIndex: number, endIndex: number) {
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

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<AnalyzeRequest>) => void) | null;
  postMessage: (message: AnalyzeResponse) => void;
};

scope.onmessage = (event: MessageEvent<AnalyzeRequest>) => {
  const message = event.data;
  if (message.type !== "analyze") return;

  let sumSquares = 0;
  let peak = 0;
  for (let i = 0; i < message.timeDomainData.length; i += 1) {
    const sample = message.timeDomainData[i] ?? 0;
    const abs = Math.abs(sample);
    sumSquares += sample * sample;
    if (abs > peak) peak = abs;
  }

  const rms = Math.sqrt(sumSquares / Math.max(1, message.timeDomainData.length));
  const bands: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i += 1) {
    const startHz = BAND_LIMITS_HZ[i] ?? 0;
    const endHz = BAND_LIMITS_HZ[i + 1] ?? 0;
    const startIndex = toBandIndex(startHz, message.sampleRate, message.fftSize);
    const endIndex = toBandIndex(endHz, message.sampleRate, message.fftSize);
    const avgDb = avgRange(message.frequencyData, startIndex, endIndex);
    bands[i] = normalizeDb(avgDb, message.minDb, message.maxDb);
  }

  const lowEnergy = (bands[0] + bands[1]) * 0.5;
  smoothedEnergy = smoothedEnergy * 0.86 + lowEnergy * 0.14;
  const onset = lowEnergy - smoothedEnergy;
  const beatPulse = onset > 0.15 && lowEnergy > 0.2;

  scope.postMessage({
    type: "analyzed",
    requestId: message.requestId,
    rms: Math.min(1, rms),
    peak: Math.min(1, peak),
    bands,
    beatPulse,
  });
};
