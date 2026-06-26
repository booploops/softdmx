/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function p95(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.floor(0.95 * Math.max(0, sorted.length - 1));
  return sorted[index] ?? 0;
}

function metric(name, samples) {
  const total = samples.reduce((acc, value) => acc + value, 0);
  return {
    name,
    count: samples.length,
    avgMs: samples.length ? total / samples.length : 0,
    p95Ms: p95(samples),
    maxMs: samples.length ? Math.max(...samples) : 0,
  };
}

function runBenchmark(profile) {
  const iterations = 180;
  const mergeSamples = [];
  const effectSamples = [];
  const audioSamples = [];
  const videoSamples = [];
  const channelCount = 1200;
  const baseChannels = new Uint8Array(channelCount);
  baseChannels.fill(80);

  for (let index = 0; index < iterations; index += 1) {
    const effectStart = performance.now();
    const effectValues = new Uint8Array(channelCount);
    for (let i = 0; i < channelCount; i += 1) {
      const phase = (index / iterations) + (i / channelCount);
      effectValues[i] = clampByte(128 + Math.sin(phase * Math.PI * 2) * 127);
    }
    effectSamples.push(performance.now() - effectStart);

    const audioStart = performance.now();
    const audioValues = new Uint8Array(channelCount);
    const rms = 0.5 + Math.sin(index / 8) * 0.3;
    for (let i = 0; i < channelCount; i += 1) {
      audioValues[i] = clampByte((effectValues[i] ?? 0) * rms);
    }
    audioSamples.push(performance.now() - audioStart);

    const videoStart = performance.now();
    const videoValues = new Uint8Array(channelCount);
    for (let i = 0; i < channelCount; i += 3) {
      videoValues[i] = (i + index * 3) % 255;
      videoValues[i + 1] = (i + index * 5) % 255;
      videoValues[i + 2] = (i + index * 7) % 255;
    }
    videoSamples.push(performance.now() - videoStart);

    const mergeStart = performance.now();
    const merged = new Uint8Array(channelCount);
    for (let i = 0; i < channelCount; i += 1) {
      const cue = (baseChannels[i] + index * 3) % 256;
      const effect = effectValues[i] ?? 0;
      const video = videoValues[i] ?? 0;
      const audio = audioValues[i] ?? 0;
      merged[i] = clampByte(Math.max(cue, effect, video, audio) * 0.95);
    }
    mergeSamples.push(performance.now() - mergeStart);
  }

  return {
    timestamp: new Date().toISOString(),
    profile,
    iterations,
    metrics: [
      metric("mergeLayers", mergeSamples),
      metric("evaluateAllEffects", effectSamples),
      metric("evaluateAudioMappings", audioSamples),
      metric("evaluateVideoMapping", videoSamples),
    ],
  };
}

async function main() {
  const profileArg = process.argv.find((arg) => arg.startsWith("--profile="));
  const profile = profileArg ? profileArg.split("=")[1] ?? "default" : "default";
  const output = runBenchmark(profile);
  const outputDir = path.resolve(process.cwd(), "perf-results");
  await fs.mkdir(outputDir, { recursive: true });
  const fileName = `runtime-baseline-${profile}-${Date.now()}.json`;
  const outputPath = path.join(outputDir, fileName);
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`Runtime baseline saved: ${outputPath}`);
}

await main();
