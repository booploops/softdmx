<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useShowStore } from 'src/stores/show';
import { useSelectionStore } from 'src/stores/selection';
import { useProgrammerStore, PROGRAMMER_FEATURE_GROUPS } from 'src/stores/programmer';
import { useScratchStore } from 'src/stores/scratch';
import { SdmxButton, SdmxEmptyState } from 'src/components/ui';
import { useInfoText } from 'src/composables/useInfoText';
import ChannelAttributeControl from 'src/components/ChannelAttributeControl.vue';
import type { AttributeFeature, FixtureChannelDefinition } from '@softdmx/engine';

const showStore = useShowStore();
const selection = useSelectionStore();
const programmer = useProgrammerStore();
const scratch = useScratchStore();
const { info } = useInfoText();

const activeGroupIndex = ref(0);
const featureGroups = PROGRAMMER_FEATURE_GROUPS;

const selectedFixtures = computed(() => {
  const names = selection.selectedFixtures.size
    ? Array.from(selection.selectedFixtures)
    : showStore.document.fixtures.slice(0, 4).map((f) => f.name);
  return showStore.document.fixtures.filter((f) => names.includes(f.name));
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
      if (group !== 'all' && channel.feature !== group) continue;
      rows.push({
        path: channel.reference.path,
        name: `${fixture.name} · ${channel.name}`,
        channel,
        feature: channel.feature,
      });
    }
  }
  return rows;
});

function isChanged(path: string): boolean {
  return scratch.entries.has(path);
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
      >
        <span class="sdmx-text-caption attribute-control-surface__cell-label">{{ row.name }}</span>
        <ChannelAttributeControl
          :channel="row.channel"
          :path="row.path"
          :show-dmx-hint="true"
          :class="{ 'attribute-control-surface__changed': isChanged(row.path) }"
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
}

.attribute-control-surface__cell-label {
  display: block;
  margin-bottom: var(--sdmx-space-xs);
}

.attribute-control-surface__changed {
  border-left: 3px solid var(--sdmx-color-scratch);
  border-radius: var(--sdmx-radius-sm);
  padding-left: var(--sdmx-space-xs);
}
</style>
