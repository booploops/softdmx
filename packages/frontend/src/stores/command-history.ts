/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

const HISTORY_KEY = 'softdmx.command_history_v2';
const AUDIT_KEY = 'softdmx.command_audit_v2';
const LIMIT = 500;

export type CommandHistoryEntry = {
  id: string;
  input: string;
  normalized: string;
  outcome: 'success' | 'error' | 'preview';
  message: string;
  tags: string[];
  createdAt: number;
};

export type CommandAuditEvent = {
  id: string;
  actor: string;
  input: string;
  planKind: string;
  risky: boolean;
  approvedViaSandbox: boolean;
  success: boolean;
  createdAt: number;
};

function readArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]') as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(key: string, data: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(data));
}

export const useCommandHistoryStore = defineStore('command-history', () => {
  const entries = ref<CommandHistoryEntry[]>(readArray<CommandHistoryEntry>(HISTORY_KEY));
  const auditEvents = ref<CommandAuditEvent[]>(readArray<CommandAuditEvent>(AUDIT_KEY));
  const query = ref('');
  const activeTags = ref<string[]>([]);

  const filteredEntries = computed(() => {
    const q = query.value.trim().toLowerCase();
    return entries.value.filter((entry) => {
      if (q && !entry.input.toLowerCase().includes(q) && !entry.message.toLowerCase().includes(q)) {
        return false;
      }
      if (activeTags.value.length === 0) return true;
      return activeTags.value.every((tag) => entry.tags.includes(tag));
    });
  });

  function addEntry(entry: Omit<CommandHistoryEntry, 'id' | 'createdAt' | 'normalized'>) {
    const normalized = entry.input.trim().toLowerCase();
    entries.value = [
      {
        id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
        normalized,
        ...entry,
      },
      ...entries.value.filter((item) => item.normalized !== normalized),
    ].slice(0, LIMIT);
    persist(HISTORY_KEY, entries.value);
  }

  function addAuditEvent(event: Omit<CommandAuditEvent, 'id' | 'createdAt'>) {
    auditEvents.value = [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
        ...event,
      },
      ...auditEvents.value,
    ].slice(0, LIMIT);
    persist(AUDIT_KEY, auditEvents.value);
  }

  function clearHistory() {
    entries.value = [];
    persist(HISTORY_KEY, entries.value);
  }

  function clearAudit() {
    auditEvents.value = [];
    persist(AUDIT_KEY, auditEvents.value);
  }

  function generateChangeLog(limit = 20): string {
    const lines = entries.value.slice(0, limit).map((entry) => {
      const stamp = new Date(entry.createdAt).toLocaleTimeString();
      return `${stamp} - ${entry.outcome.toUpperCase()} - ${entry.input} - ${entry.message}`;
    });
    return lines.join('\n');
  }

  function recoverLookCandidate(): CommandHistoryEntry | null {
    return entries.value.find((entry) => entry.outcome === 'success') ?? null;
  }

  return {
    entries,
    auditEvents,
    query,
    activeTags,
    filteredEntries,
    addEntry,
    addAuditEvent,
    clearHistory,
    clearAudit,
    generateChangeLog,
    recoverLookCandidate,
  };
});
