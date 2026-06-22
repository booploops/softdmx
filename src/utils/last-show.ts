/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ScratchEntry } from 'src/engine/layers/scratch';
import type { ShowDocument } from 'src/show/document';
import { readCrashSnapshot } from './crash-snapshot.ts';

const LAST_SHOW_KEY = 'softdmx.last-show.v1';

export interface LastShowSession {
  savedAt: string;
  document: ShowDocument;
  scratch?: ScratchEntry[];
  filePath?: string | null;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readLastShow(): LastShowSession | null {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(LAST_SHOW_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LastShowSession;
        if (parsed?.document) return parsed;
      } catch {
        // fall through to crash snapshot
      }
    }
  }

  const crash = readCrashSnapshot();
  if (!crash?.document) return null;

  return {
    savedAt: crash.savedAt,
    document: crash.document,
    scratch: crash.scratch,
  };
}

export function writeLastShow(session: Omit<LastShowSession, 'savedAt'> & { savedAt?: string }) {
  if (!canUseLocalStorage()) return;

  const next: LastShowSession = {
    savedAt: session.savedAt ?? new Date().toISOString(),
    document: session.document,
    scratch: session.scratch,
    filePath: session.filePath,
  };

  try {
    window.localStorage.setItem(LAST_SHOW_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Failed to write last show session:', error);
  }
}

export function formatLastShowSavedAt(savedAt: string): string {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
}
