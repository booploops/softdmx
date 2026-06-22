<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { computed } from 'vue';

type PatchGridFixture = {
  name: string;
  startChannel: number;
  endChannel: number;
  channelCount: number;
  hasOverlap?: boolean;
  outOfRange?: boolean;
};

const props = withDefaults(
  defineProps<{
    fixtures: PatchGridFixture[];
    title?: string;
    channelCount?: number;
    channelStep?: number;
  }>(),
  {
    title: 'Universe Patch Grid',
    channelCount: 512,
    channelStep: 16,
  }
);

const pixelsPerChannel = 3;
const gridWidth = computed(() => props.channelCount * pixelsPerChannel);

const sortedFixtures = computed(() =>
  [...props.fixtures].sort((a, b) => a.startChannel - b.startChannel)
);

function channelToPx(channel: number): number {
  return (Math.max(1, Math.min(props.channelCount, channel)) - 1) * pixelsPerChannel;
}

function widthToPx(start: number, end: number): number {
  const clampedStart = Math.max(1, Math.min(props.channelCount, start));
  const clampedEnd = Math.max(1, Math.min(props.channelCount, end));
  return Math.max(4, (clampedEnd - clampedStart + 1) * pixelsPerChannel);
}

const channelTicks = computed(() => {
  const ticks: number[] = [];
  for (let ch = 1; ch <= props.channelCount; ch += props.channelStep) {
    ticks.push(ch);
  }
  if (!ticks.includes(props.channelCount)) ticks.push(props.channelCount);
  return ticks;
});
</script>

<template>
  <div class="patch-grid">
    <div class="text-subtitle2 q-mb-sm">{{ title }}</div>
    <q-scroll-area class="grid-scroll">
      <div class="grid-content" :style="{ width: `${gridWidth}px` }">
        <div class="channel-strip">
          <div
            v-for="tick in channelTicks"
            :key="`tick-${tick}`"
            class="channel-tick"
            :style="{ left: `${channelToPx(tick)}px` }"
          >
            {{ tick }}
          </div>
        </div>

        <div v-if="sortedFixtures.length === 0" class="text-caption text-grey-6 q-py-sm">
          No fixtures routed to this destination.
        </div>

        <div
          v-for="fixture in sortedFixtures"
          :key="`${fixture.name}-${fixture.startChannel}`"
          class="fixture-row"
        >
          <div class="fixture-name text-caption ellipsis">{{ fixture.name }}</div>
          <div class="fixture-track">
            <div
              class="fixture-block"
              :class="{
                overlap: fixture.hasOverlap,
                outOfRange: fixture.outOfRange,
              }"
              :style="{
                left: `${channelToPx(fixture.startChannel)}px`,
                width: `${widthToPx(fixture.startChannel, fixture.endChannel)}px`,
              }"
            >
              <span class="text-caption">
                {{ fixture.startChannel }}-{{ fixture.endChannel }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<style scoped>
.patch-grid {
  border: 1px solid var(--sdmx-color-border);
  border-radius: 8px;
  padding: 10px;
  background: var(--sdmx-color-bg-inset);
}

.grid-scroll {
  height: 220px;
}

.grid-content {
  min-height: 180px;
  position: relative;
}

.channel-strip {
  height: 24px;
  border-bottom: 1px dashed var(--sdmx-color-border-strong);
  position: relative;
  margin-bottom: 8px;
}

.channel-tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 10px;
  color: var(--sdmx-color-text-muted);
}

.fixture-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  align-items: center;
  gap: 10px;
  min-height: 28px;
  margin-bottom: 6px;
}

.fixture-track {
  position: relative;
  height: 24px;
  border-radius: 4px;
  background: var(--sdmx-color-bg-muted);
}

.fixture-name {
  color: var(--sdmx-color-text-muted);
}

.fixture-block {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 4px;
  background: var(--sdmx-color-primary-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  white-space: nowrap;
  color: var(--sdmx-color-text);
}

.fixture-block.overlap {
  background: var(--sdmx-color-negative-strong);
}

.fixture-block.outOfRange {
  outline: 1px solid var(--sdmx-color-warning);
}
</style>
