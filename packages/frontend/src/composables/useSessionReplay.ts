/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref } from 'vue';
import {
  replaySessionEventsToState,
  replaySessionToEntries,
  type ProgrammerSession,
  type ScratchEntry,
} from '@softdmx/engine';

export function useSessionReplay(initialSession?: ProgrammerSession | null) {
  const session = ref<ProgrammerSession | null>(initialSession ?? null);
  const atSec = ref(0);
  const clientIdFilter = ref<string | null>(null);

  const filteredEvents = computed(() => {
    if (!session.value) return [];
    if (!clientIdFilter.value) return session.value.events;
    return session.value.events.filter(
      (event) => !event.clientId || event.clientId === clientIdFilter.value
    );
  });

  const entries = computed<ScratchEntry[]>(() => {
    if (!session.value) return [];
    return replaySessionToEntries(filteredEvents.value, atSec.value);
  });

  const replayState = computed(() => {
    if (!session.value) return { entries: new Map<string, ScratchEntry>(), blind: false };
    return replaySessionEventsToState(filteredEvents.value, atSec.value);
  });

  const durationSec = computed(() => {
    if (!session.value || session.value.events.length === 0) return 0;
    return Math.max(...session.value.events.map((event) => event.tSec));
  });

  function loadSession(nextSession: ProgrammerSession | null) {
    session.value = nextSession;
    atSec.value = 0;
  }

  function seek(sec: number) {
    atSec.value = Math.max(0, sec);
  }

  function setClientIdFilter(clientId: string | null) {
    clientIdFilter.value = clientId;
  }

  return {
    session,
    atSec,
    clientIdFilter,
    filteredEvents,
    entries,
    replayState,
    durationSec,
    loadSession,
    seek,
    setClientIdFilter,
  };
}
