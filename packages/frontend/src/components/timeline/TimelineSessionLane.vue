<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { ProgrammerSession, ProgrammerSessionEvent } from '@softdmx/engine';
import { computed } from 'vue';
import { useShowStore } from 'src/stores/show';
import { useTimelineEditorStore } from 'src/stores/timeline-editor';

const props = defineProps<{
  pixelsPerSecond: number;
  timelineWidthPx: number;
}>();

const showStore = useShowStore();
const timelineEditor = useTimelineEditorStore();

const operatorColors = computed(() => {
  const map = new Map<string, string>();
  for (const operator of showStore.document.programmer?.operators ?? []) {
    if (operator.color) map.set(operator.id, operator.color);
  }
  return map;
});

const sessions = computed(() => showStore.document.timeline?.programmerSessions ?? []);

const visibleEvents = computed(() => {
  const events: Array<ProgrammerSessionEvent & { session: ProgrammerSession; color?: string }> = [];
  for (const session of sessions.value) {
    for (const event of session.events) {
      if (timelineEditor.operatorFilterClientId && event.clientId !== timelineEditor.operatorFilterClientId) {
        continue;
      }
      events.push({
        ...event,
        session,
        color: event.clientId ? operatorColors.value.get(event.clientId) : undefined,
      });
    }
  }
  return events.sort((a, b) => a.tSec - b.tSec);
});
</script>

<template>
  <div class="timeline-session-lane timeline-lane" :style="{ width: `${timelineWidthPx}px` }">
    <div class="lane-label"><span>Sessions</span></div>
    <div
      v-for="(event, index) in visibleEvents"
      :key="`${event.session.id}-${event.tSec}-${index}`"
      class="timeline-session-event"
      :class="`timeline-session-event--${event.kind}`"
      :style="{
        left: `${(event.tSec + event.session.anchorSec) * pixelsPerSecond}px`,
        borderColor: event.color,
      }"
      :title="`${event.kind}${event.path ? `: ${event.path}` : ''}${event.label ? ` (${event.label})` : ''}`"
    >
      <span class="timeline-session-event__dot" :style="{ backgroundColor: event.color }" />
    </div>
    <div v-if="visibleEvents.length === 0" class="lane-empty">No session events for current operator filter.</div>
  </div>
</template>

<style scoped lang="scss">
.timeline-session-lane {
  position: relative;
  min-height: 48px;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.timeline-session-event {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--sdmx-color-scratch);
  background: var(--sdmx-color-bg-surface);
}

.timeline-session-event--marker {
  width: 0;
  height: 0;
  border: none;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 10px solid var(--sdmx-color-warning);
  border-radius: 0;
  background: transparent;
}

.timeline-session-event__dot {
  display: none;
}

.lane-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  padding-left: 120px;
  color: var(--sdmx-color-text-muted);
  font-size: var(--sdmx-font-size-caption);
}
</style>
