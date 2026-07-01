/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ScratchEntry, ProgrammerSessionEvent } from '@softdmx/engine';
import type { ShowDocument } from '@softdmx/engine';

const CRASH_SNAPSHOT_KEY = 'softdmx.crash-snapshot.v1';

export interface SessionBufferSnapshot {
  sessionId: string;
  events: ProgrammerSessionEvent[];
  clientId?: string;
  armed: boolean;
  clockMode?: 'session' | 'set-playhead' | 'timecode' | 'audio';
  sessionStartedAt?: string;
}

export interface CrashSnapshot {
  savedAt: string;
  document?: ShowDocument;
  scratch?: ScratchEntry[];
  sessionBuffer?: SessionBufferSnapshot;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readCrashSnapshot(): CrashSnapshot | null {
  if (!canUseLocalStorage()) return null;

  const raw = window.localStorage.getItem(CRASH_SNAPSHOT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CrashSnapshot;
  } catch {
    return null;
  }
}

export function writeCrashSnapshot(partial: {
  document?: ShowDocument;
  scratch?: ScratchEntry[];
  sessionBuffer?: SessionBufferSnapshot;
}) {
  if (!canUseLocalStorage()) return;

  const current = readCrashSnapshot() ?? { savedAt: new Date().toISOString() };
  const next: CrashSnapshot = {
    ...current,
    ...partial,
    savedAt: new Date().toISOString(),
  };

  if (partial.sessionBuffer === undefined && 'sessionBuffer' in partial) {
    delete next.sessionBuffer;
  }

  try {
    window.localStorage.setItem(CRASH_SNAPSHOT_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Failed to write crash snapshot:', error);
  }
}

export function clearCrashSnapshot() {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(CRASH_SNAPSHOT_KEY);
}
