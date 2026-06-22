/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const DB_NAME = 'softdmx-timeline-audio';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

export type StoredTimelineAudioAsset = {
  id: string;
  fileName: string;
  mimeType: string;
  durationMs: number;
  peaks: number[];
  blob: Blob;
};

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveTimelineAudioAsset(asset: StoredTimelineAudioAsset): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save timeline audio asset'));
    tx.objectStore(STORE_NAME).put(asset);
  });
}

export async function loadTimelineAudioAsset(id: string): Promise<StoredTimelineAudioAsset | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to load timeline audio asset'));
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as StoredTimelineAudioAsset | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Failed to read timeline audio asset'));
  });
}

export async function deleteTimelineAudioAsset(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete timeline audio asset'));
    tx.objectStore(STORE_NAME).delete(id);
  });
}

export function buildWaveformPeaks(buffer: AudioBuffer, bucketCount = 512): number[] {
  const channelData = buffer.getChannelData(0);
  if (!channelData || channelData.length === 0) return [];

  const samplesPerBucket = Math.max(1, Math.floor(channelData.length / bucketCount));
  const peaks: number[] = [];

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = bucket * samplesPerBucket;
    const end = Math.min(channelData.length, start + samplesPerBucket);
    let peak = 0;
    for (let i = start; i < end; i += 1) {
      peak = Math.max(peak, Math.abs(channelData[i] ?? 0));
    }
    peaks.push(peak);
  }

  return peaks;
}

export async function decodeAudioFile(file: File): Promise<{
  buffer: AudioBuffer;
  durationMs: number;
  peaks: number[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return {
      buffer,
      durationMs: Math.round(buffer.duration * 1000),
      peaks: buildWaveformPeaks(buffer),
    };
  } finally {
    await audioContext.close();
  }
}
