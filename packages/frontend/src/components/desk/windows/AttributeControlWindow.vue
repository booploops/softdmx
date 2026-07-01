<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useShowStore } from 'src/stores/show';
import { useDMXStore } from 'src/stores/dmx';
import { useSelectionStore } from 'src/stores/selection';
import { useProgrammerStore, PROGRAMMER_FEATURE_GROUPS } from 'src/stores/programmer';
import { useScratchStore } from 'src/stores/scratch';
import { SdmxButton, SdmxEmptyState } from 'src/components/ui';
import { useInfoText } from 'src/composables/useInfoText';
import { useActiveAttribute } from 'src/composables/useActiveAttribute';
import { resolveOperatorColor } from 'src/utils/resolve-channel-path';
import ChannelAttributeControl from 'src/components/ChannelAttributeControl.vue';
import type { AttributeFeature, FixtureChannelDefinition } from '@softdmx/engine';
import { inferAttributeFeature } from '@softdmx/engine';

const showStore = useShowStore();
const dmx = useDMXStore();
const selection = useSelectionStore();
const programmer = useProgrammerStore();
const scratch = useScratchStore();
const { info } = useInfoText();
const { setActive, isActive } = useActiveAttribute();

const activeGroupIndex = ref(0);
const featureGroups = PROGRAMMER_FEATURE_GROUPS;

const selectedFixtures = computed(() => {
  const names = selection.selectedFixtures.size
    ? Array.from(selection.selectedFixtures)
    : showStore.document.fixtures.slice(0, 4).map((f) => f.name);
  return dmx.showfileFixturesMapped.filter((fixture) => names.includes(fixture.fixtureName));
});

interface ChannelRow {
  path: string;
  name: string;
  channel: FixtureChannelDefinition;
  feature: AttributeFeature;
}

const channelRows = computed<ChannelRow[]>(() => {
  const group = featureGroups[activeGroupIndex.value]?.id ?? 'all';
  const rows: ChannelRow[] = [];

  for (const fixture of selectedFixtures.value) {
    for (const channel of fixture.def.channels) {
      const feature = inferAttributeFeature(channel.type, channel.name);
      if (group !== 'all' && feature !== group) continue;
      const path = channel.reference?.path;
      if (!path) continue;
      rows.push({
        path,
        name: `${fixture.fixtureName} · ${channel.name}`,
        channel,
        feature,
      });
    }
  }
  return rows;
});

function scratchEntry(path: string) {
  return scratch.entries.get(path);
}

function isChanged(path: string): boolean {
  return scratch.entries.has(path);
}

function changedStyle(path: string): Record<string, string> | undefined {
  const entry = scratchEntry(path);
  if (!entry) return undefined;
  const color = resolveOperatorColor(entry);
  if (!color) return undefined;
  return {
    borderLeftColor: color,
    background: `color-mix(in srgb, ${color} 12%, var(--sdmx-color-bg-surface))`,
  };
}

function onCellTap(path: string) {
  setActive(path);
}

function prevGroup() {
  activeGroupIndex.value =
    (activeGroupIndex.value - 1 + featureGroups.length) % featureGroups.length;
  programmer.setFeatureGroup(featureGroups[activeGroupIndex.value]!.id);
}

function nextGroup() {
  activeGroupIndex.value = (activeGroupIndex.value + 1) % featureGroups.length;
  programmer.setFeatureGroup(featureGroups[activeGroupIndex.value]!.id);
}
</script>

<template>
  <div class="attribute-control-surface">
    <div class="attribute-control-surface__tabs">
      <SdmxButton icon="chevron_left" variant="ghost" size="sm" :info="info('desk.attributes.prevGroup')" @click="prevGroup" />
      <span class="sdmx-text-label attribute-control-surface__group-label">
        {{ featureGroups[activeGroupIndex]?.label }}
      </span>
      <SdmxButton icon="chevron_right" variant="ghost" size="sm" :info="info('desk.attributes.nextGroup')" @click="nextGroup" />
    </div>

    <SdmxEmptyState
      v-if="!channelRows.length"
      icon="tune"
      title="No attributes"
      hint="Select fixtures to edit their parameters with on-screen encoders."
    />

    <div v-else class="attribute-control-surface__grid">
      <div
        v-for="row in channelRows"
        :key="row.path"
        class="attribute-control-surface__cell"
        :class="{
          'attribute-control-surface__changed': isChanged(row.path),
          'attribute-control-surface__active': isActive(row.path),
        }"
        :style="changedStyle(row.path)"
        @click="onCellTap(row.path)"
      >
        <div class="attribute-control-surface__cell-header">
          <span
            v-if="resolveOperatorColor(scratchEntry(row.path) ?? {})"
            class="attribute-control-surface__operator"
            :style="{ backgroundColor: resolveOperatorColor(scratchEntry(row.path) ?? {}) }"
          />
          <span class="sdmx-text-caption attribute-control-surface__cell-label">{{ row.name }}</span>
        </div>
        <ChannelAttributeControl
          :channel="row.channel"
          :path="row.path"
          :show-dmx-hint="true"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.attribute-control-surface {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.attribute-control-surface__tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-sm);
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
  flex-shrink: 0;
}

.attribute-control-surface__group-label {
  min-width: 80px;
  text-align: center;
}

.attribute-control-surface__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-sm);
  overflow: auto;
  flex: 1 1 auto;
  align-content: start;
}

.attribute-control-surface__cell {
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: var(--sdmx-color-bg-surface);
  padding: var(--sdmx-space-xs);
  cursor: pointer;
}

.attribute-control-surface__cell-header {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
  margin-bottom: var(--sdmx-space-xs);
}

.attribute-control-surface__cell-label {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attribute-control-surface__operator {
  width: 8px;
  height: 8px;
  border-radius: var(--sdmx-radius-full);
  flex-shrink: 0;
}

.attribute-control-surface__changed {
  border-left: 3px solid var(--sdmx-color-scratch);
}

.attribute-control-surface__active {
  border-color: var(--sdmx-color-active);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sdmx-color-active) 35%, transparent);
}
</style>
