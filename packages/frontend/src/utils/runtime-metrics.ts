/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

type MetricBucket = {
  count: number;
  totalMs: number;
  maxMs: number;
  samples: number[];
};

export interface RuntimeMetricSummary {
  label: string;
  count: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
}

const MAX_SAMPLES = 500;
const buckets = new Map<string, MetricBucket>();

function getBucket(label: string): MetricBucket {
  const existing = buckets.get(label);
  if (existing) return existing;
  const created: MetricBucket = {
    count: 0,
    totalMs: 0,
    maxMs: 0,
    samples: [],
  };
  buckets.set(label, created);
  return created;
}

export function recordRuntimeMetric(label: string, elapsedMs: number) {
  if (!Number.isFinite(elapsedMs)) return;
  const bucket = getBucket(label);
  bucket.count += 1;
  bucket.totalMs += elapsedMs;
  bucket.maxMs = Math.max(bucket.maxMs, elapsedMs);
  bucket.samples.push(elapsedMs);
  if (bucket.samples.length > MAX_SAMPLES) {
    bucket.samples.shift();
  }
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[idx] ?? 0;
}

export function getRuntimeMetricSummaries(): RuntimeMetricSummary[] {
  const summaries: RuntimeMetricSummary[] = [];
  for (const [label, bucket] of buckets.entries()) {
    const sorted = [...bucket.samples].sort((a, b) => a - b);
    summaries.push({
      label,
      count: bucket.count,
      avgMs: bucket.count === 0 ? 0 : bucket.totalMs / bucket.count,
      p95Ms: percentile(sorted, 0.95),
      maxMs: bucket.maxMs,
    });
  }
  return summaries.sort((a, b) => a.label.localeCompare(b.label));
}

export function resetRuntimeMetrics() {
  buckets.clear();
}

export function measureRuntime<T>(label: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    recordRuntimeMetric(label, performance.now() - start);
  }
}
