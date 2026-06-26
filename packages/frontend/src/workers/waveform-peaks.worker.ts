/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

type BuildPeaksRequest = {
  type: "build-peaks";
  requestId: number;
  samples: Float32Array;
  bucketCount: number;
};

type BuildPeaksResponse =
  | { type: "peaks"; requestId: number; peaks: number[] }
  | { type: "error"; requestId: number; error: string };

function buildWaveformPeaks(samples: Float32Array, bucketCount = 512): number[] {
  if (samples.length === 0) return [];
  const samplesPerBucket = Math.max(1, Math.floor(samples.length / bucketCount));
  const peaks: number[] = [];

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = bucket * samplesPerBucket;
    const end = Math.min(samples.length, start + samplesPerBucket);
    let peak = 0;
    for (let i = start; i < end; i += 1) {
      peak = Math.max(peak, Math.abs(samples[i] ?? 0));
    }
    peaks.push(peak);
  }
  return peaks;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BuildPeaksRequest>) => void) | null;
  postMessage: (message: BuildPeaksResponse) => void;
};

scope.onmessage = (event: MessageEvent<BuildPeaksRequest>) => {
  const message = event.data;
  if (message.type !== "build-peaks") return;
  try {
    const peaks = buildWaveformPeaks(message.samples, message.bucketCount);
    scope.postMessage({
      type: "peaks",
      requestId: message.requestId,
      peaks,
    });
  } catch (error) {
    scope.postMessage({
      type: "error",
      requestId: message.requestId,
      error: error instanceof Error ? error.message : "Waveform peak worker failure",
    });
  }
};
