/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  SessionRecorder,
  msToSeconds,
  type ProgrammerSession,
  type ProgrammerSessionEvent,
  type ScratchWriteMeta,
  type SessionRecordingPolicy,
} from '@softdmx/engine';
import { useShowStore } from './show';
import { useClientIdentityStore } from './client-identity';
import { useTimelineEditorStore } from './timeline-editor';
import { writeCrashSnapshot } from 'src/utils/crash-snapshot';

const DEFAULT_RECORDING_POLICY: SessionRecordingPolicy = {
  coalesceMs: 80,
  captureLastMs: 30_000,
  keyframeIdleMs: 500,
  semanticOnly: false,
};

export const useProgrammerSessionStore = defineStore('programmer-session', () => {
  const armed = ref(false);
  const activeSessionId = ref<string | null>(null);
  const clockMode = ref<ProgrammerSession['clock']>('session');
  const sessionStartedAt = ref<string | null>(null);
  const sessionAnchorSec = ref(0);
  const recordingPolicy = ref<SessionRecordingPolicy>({ ...DEFAULT_RECORDING_POLICY });
  const clientIdFilter = ref<string | null>(null);

  let recordingEpochSec = 0;
  const clock = {
    nowSec: () => Math.max(0, performance.now() / 1000 - recordingEpochSec),
  };
  const recorder = new SessionRecorder(clock, { ...DEFAULT_RECORDING_POLICY });

  const clockLabel = computed(() => {
    switch (clockMode.value) {
      case 'set-playhead':
        return 'Set playhead';
      case 'timecode':
        return 'Timecode';
      case 'audio':
        return 'Audio';
      default:
        return 'Session';
    }
  });

  function ensureTimeline() {
    const showStore = useShowStore();
    if (!showStore.document.timeline) {
      showStore.document.timeline = {};
    }
    if (!showStore.document.timeline.programmerSessions) {
      showStore.document.timeline.programmerSessions = [];
    }
    return showStore.document.timeline.programmerSessions;
  }

  function persistSessionBuffer() {
    if (!armed.value || !activeSessionId.value) return;

    recorder.flushPending();
    const identity = useClientIdentityStore();
    writeCrashSnapshot({
      sessionBuffer: {
        sessionId: activeSessionId.value,
        events: recorder.getEvents(),
        clientId: identity.clientId,
        armed: armed.value,
        clockMode: clockMode.value,
        sessionStartedAt: sessionStartedAt.value ?? undefined,
      },
    });
  }

  function setRecordingPolicy(policy: Partial<SessionRecordingPolicy>) {
    recordingPolicy.value = { ...recordingPolicy.value, ...policy };
    recorder.setPolicy(recordingPolicy.value);
  }

  function setClientIdFilter(clientId: string | null) {
    clientIdFilter.value = clientId;
  }

  function filterEventsForClient(events: ProgrammerSessionEvent[]): ProgrammerSessionEvent[] {
    if (!clientIdFilter.value) return events;
    return events.filter((event) => !event.clientId || event.clientId === clientIdFilter.value);
  }

  function persistActiveSession() {
    if (!activeSessionId.value) return;

    recorder.flushPending();
    const events = filterEventsForClient(recorder.getEvents());
    if (events.length === 0) return;

    const showStore = useShowStore();
    const sessions = ensureTimeline();
    const existing = sessions.find((session) => session.id === activeSessionId.value);
    const endedAt = new Date().toISOString();

    showStore.updateDocument((doc) => {
      const timelineSessions = doc.timeline?.programmerSessions ?? [];
      const index = timelineSessions.findIndex((session) => session.id === activeSessionId.value);
      const nextSession: ProgrammerSession = {
        id: activeSessionId.value!,
        name: existing?.name ?? `Session ${timelineSessions.length + 1}`,
        anchorSec: sessionAnchorSec.value,
        startedAt: sessionStartedAt.value ?? existing?.startedAt ?? endedAt,
        endedAt,
        clock: clockMode.value,
        events,
      };

      if (index >= 0) {
        timelineSessions[index] = nextSession;
      } else {
        timelineSessions.push(nextSession);
      }

      if (!doc.timeline) doc.timeline = {};
      doc.timeline.programmerSessions = timelineSessions;
    });
  }

  function upsertAutomationClip(sessionId: string) {
    const timelineEditor = useTimelineEditorStore();
    timelineEditor.upsertAutomationClip(sessionId, {
      clientId: clientIdFilter.value ?? undefined,
    });
  }

  function arm(options?: { sessionId?: string; clock?: ProgrammerSession['clock'] }) {
    armed.value = true;
    activeSessionId.value = options?.sessionId ?? crypto.randomUUID();
    clockMode.value = options?.clock ?? clockMode.value;
    sessionStartedAt.value = new Date().toISOString();
    recordingEpochSec = performance.now() / 1000;

    if (clockMode.value === 'set-playhead' || clockMode.value === 'timecode') {
      const timelineEditor = useTimelineEditorStore();
      sessionAnchorSec.value = msToSeconds(timelineEditor.playheadMs);
    } else {
      sessionAnchorSec.value = 0;
    }

    recorder.reset([]);
    persistSessionBuffer();
  }

  function disarm(options?: { persist?: boolean }) {
    const sessionId = activeSessionId.value;
    if (options?.persist !== false) {
      persistActiveSession();
      if (sessionId) {
        upsertAutomationClip(sessionId);
      }
    } else {
      recorder.flushPending();
    }
    armed.value = false;
    activeSessionId.value = null;
    sessionStartedAt.value = null;
    sessionAnchorSec.value = 0;
    writeCrashSnapshot({ sessionBuffer: undefined });
  }

  function appendEvent(event: ProgrammerSessionEvent) {
    if (!armed.value) return;
    if (clientIdFilter.value && event.clientId && event.clientId !== clientIdFilter.value) {
      return;
    }
    recorder.append(event);
    persistSessionBuffer();
  }

  function buildWriteMeta(source: ScratchWriteMeta['source'], meta?: ScratchWriteMeta): ScratchWriteMeta {
    const identity = useClientIdentityStore();
    return {
      source,
      clientId: identity.clientId,
      operatorLabel: identity.operatorLabel,
      color: identity.color,
      ...meta,
    };
  }

  function dropMarker(label = 'Marker') {
    if (!armed.value) return;
    const identity = useClientIdentityStore();
    appendEvent({
      tSec: clock.nowSec(),
      kind: 'marker',
      label,
      clientId: identity.clientId,
      meta: buildWriteMeta('attribute-control'),
    });
  }

  function recordChannel(
    path: string,
    value: number,
    options?: {
      attributeType?: string;
      source?: ScratchWriteMeta['source'];
      meta?: ScratchWriteMeta;
    },
  ) {
    if (!armed.value) return;

    const identity = useClientIdentityStore();
    if (clientIdFilter.value && identity.clientId !== clientIdFilter.value) {
      return;
    }

    recorder.appendChannel(path, value, {
      attributeType: options?.attributeType,
      clientId: identity.clientId,
      meta: buildWriteMeta(options?.source ?? 'attribute-control', options?.meta),
    });
    persistSessionBuffer();
  }

  function recordChannels(
    channels: Array<{ path: string; value: number; attributeType?: string }>,
    options?: { source?: ScratchWriteMeta['source']; meta?: ScratchWriteMeta },
  ) {
    for (const channel of channels) {
      recordChannel(channel.path, channel.value, {
        attributeType: channel.attributeType,
        source: options?.source,
        meta: options?.meta,
      });
    }
  }

  function loadSession(sessionId: string) {
    const showStore = useShowStore();
    const session = showStore.document.timeline?.programmerSessions?.find((entry) => entry.id === sessionId);
    if (!session) return;

    activeSessionId.value = session.id;
    clockMode.value = session.clock;
    sessionStartedAt.value = session.startedAt;
    sessionAnchorSec.value = session.anchorSec;
    recorder.reset(session.events);
  }

  return {
    armed,
    activeSessionId,
    clockMode,
    clockLabel,
    sessionStartedAt,
    sessionAnchorSec,
    recordingPolicy,
    clientIdFilter,
    recorder,
    arm,
    disarm,
    appendEvent,
    dropMarker,
    recordChannel,
    recordChannels,
    persistActiveSession,
    upsertAutomationClip,
    loadSession,
    buildWriteMeta,
    setRecordingPolicy,
    setClientIdFilter,
    filterEventsForClient,
  };
});
