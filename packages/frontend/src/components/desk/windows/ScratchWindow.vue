<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import ChannelAttributeControl from 'src/components/ChannelAttributeControl.vue';
import { useScratchStore } from 'src/stores/scratch';
import { useSelectionStore } from 'src/stores/selection';
import { useProgrammerStore } from 'src/stores/programmer';
import { useClientIdentityStore } from 'src/stores/client-identity';
import { useShowStore } from 'src/stores/show';
import { useDMXStore } from 'src/stores/dmx';
import { useActiveAttribute } from 'src/composables/useActiveAttribute';
import { filterScratchEntries } from 'src/utils/programmer-filter';
import { resolveChannelForPath, resolveOperatorColor } from 'src/utils/resolve-channel-path';
import { inferAttributeFeature } from '@softdmx/engine';
import type { ScratchEntry } from '@softdmx/engine';
import {
  SdmxButton,
  SdmxEmptyState,
  SdmxStatusChip,
} from 'src/components/ui';
import ScratchConflictPanel from 'src/components/programmer/ScratchConflictPanel.vue';
import { useScratchConflicts } from 'src/composables/useScratchConflicts';
import { ref, computed } from 'vue';

const scratch = useScratchStore();
const selection = useSelectionStore();
const programmer = useProgrammerStore();
const clientIdentity = useClientIdentityStore();
const showStore = useShowStore();
const dmx = useDMXStore();
const { setActive, isActive, isPathPinned } = useActiveAttribute();
const { conflicts, isConflictPath } = useScratchConflicts();

const showConflicts = ref(false);

function entryMatchesSelection(entry: ScratchEntry): boolean {
  if (!selection.hasSelection) return true;
  const fixtureMatch = Array.from(selection.selectedFixtures).some((name) =>
    entry.path.includes(name)
  );
  const groupMatch = Array.from(selection.selectedGroups).some((name) =>
    entry.path.includes(name)
  );
  return fixtureMatch || groupMatch;
}

function entryMatchesOperator(entry: ScratchEntry): boolean {
  if (programmer.operatorScope === 'all') return true;
  const owner = entry.meta?.clientId ?? entry.clientId;
  return owner === clientIdentity.clientId;
}

function entryMatchesActive(entry: ScratchEntry): boolean {
  if (!programmer.activeOnly) return true;
  if (programmer.pinnedAttributePath) {
    return entry.path === programmer.pinnedAttributePath;
  }
  if (!programmer.activeAttributePath) return true;
  const activeName = scratch.entries.get(programmer.activeAttributePath)?.attributeName;
  if (activeName && entry.attributeName) {
    return entry.attributeName === activeName;
  }
  return entry.path === programmer.activeAttributePath;
}

const scratchRows = computed(() => {
  let list = Array.from(scratch.entries.values());
  list = filterScratchEntries(list, programmer.attributeFilter());

  if (programmer.scratchedOnly) {
    list = list.filter((entry) => scratch.entries.has(entry.path));
  }
  if (programmer.activeOnly) {
    list = list.filter(entryMatchesActive);
  }
  list = list.filter(entryMatchesOperator);

  return list.sort((a, b) => (b.touchedAt ?? 0) - (a.touchedAt ?? 0));
});

const selectionChannelRows = computed(() => {
  if (programmer.scratchedOnly || !selection.hasSelection) return [];

  const names = new Set<string>();
  for (const fixtureName of selection.selectedFixtures) names.add(fixtureName);
  for (const groupName of selection.selectedGroups) {
    const group = showStore.document.groups.find((entry) => entry.name === groupName);
    for (const fixtureName of group?.fixtures ?? []) names.add(fixtureName);
  }

  const rows: ScratchEntry[] = [];
  for (const fixtureName of names) {
    const mapped = dmx.showfileFixturesMapped.find((fixture) => fixture.fixtureName === fixtureName);
    if (!mapped) continue;
    for (const channel of mapped.def.channels) {
      const path = channel.reference?.path;
      if (!path || scratch.entries.has(path)) continue;
      const feature = inferAttributeFeature(channel.type, channel.name);
      const filter = programmer.attributeFilter();
      if (filter && feature && !filter.includes(feature)) continue;
      if (!entryMatchesActive({ path, attributeName: channel.name } as ScratchEntry)) continue;
      rows.push({
        path,
        value: dmx.getChannelByPath(path)?.value ?? channel.defaultValue ?? 0,
        attributeType: channel.type,
        attributeName: channel.name,
        attributeId: channel.attributeId ?? channel.name,
        feature,
        touchedAt: 0,
      });
    }
  }
  return rows;
});

const displayRows = computed(() =>
  programmer.scratchedOnly ? scratchRows.value : [...scratchRows.value, ...selectionChannelRows.value]
);

function onScratchRowTap(entry: ScratchEntry) {
  setActive(entry.path);
}

function rowLabel(entry: ScratchEntry): string {
  return entry.attributeName ?? entry.path.split('/').pop() ?? entry.path;
}

function resolveRowChannel(entry: ScratchEntry) {
  return resolveChannelForPath(entry.path, dmx.showfileFixturesMapped);
}
</script>

<template>
  <div class="scratch-window">
    <div class="programmer-scroll">
      <div class="programmer-scratch-section">
        <div class="programmer-scratch-header">
          <span class="sdmx-text-label">Scratch</span>
          <SdmxStatusChip
            v-if="conflicts.length"
            :label="`${conflicts.length}`"
            variant="warning"
            icon="alert-triangle"
          />
          <q-space />
          <SdmxButton
            v-if="conflicts.length"
            size="sm"
            variant="ghost"
            :label="showConflicts ? 'Hide' : 'Conflicts'"
            @click="showConflicts = !showConflicts"
          />
        </div>

        <q-slide-transition>
          <div v-show="showConflicts && conflicts.length" class="programmer-conflicts">
            <ScratchConflictPanel />
          </div>
        </q-slide-transition>

        <SdmxEmptyState
          v-if="!displayRows.length"
          icon="adjustments"
          title="Nothing to show"
          hint="Select fixtures, then adjust controls below — touched values appear here."
        />

        <div v-else class="programmer-scratch-list">
          <div
            v-for="entry in displayRows"
            :key="entry.path"
            class="programmer-scratch-row"
            :class="{
              'programmer-scratch-row--active': isActive(entry.path),
              'programmer-scratch-row--pinned': isPathPinned(entry.path),
              'programmer-scratch-row--conflict': isConflictPath(entry.path),
              'programmer-scratch-row--untouched': entry.touchedAt === 0,
            }"
            @click="onScratchRowTap(entry)"
          >
            <span
              v-if="resolveOperatorColor(entry)"
              class="programmer-operator-chip"
              :style="{ backgroundColor: resolveOperatorColor(entry) }"
              :title="entry.meta?.operatorLabel ?? entry.meta?.clientId ?? 'operator'"
            />
            <div class="programmer-scratch-row__meta">
              <div class="programmer-scratch-row__name">{{ rowLabel(entry) }}</div>
            </div>
            <div v-if="resolveRowChannel(entry)" class="programmer-scratch-row__control">
              <ChannelAttributeControl
                :channel="resolveRowChannel(entry)!"
                :path="entry.path"
                :show-dmx-hint="false"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.scratch-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--sdmx-color-bg-surface);
}

.programmer-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.programmer-scratch-section {
  flex-shrink: 0;
  border-bottom: 1px solid var(--sdmx-color-border-subtle);
}

.programmer-scratch-header {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-sm);
  position: sticky;
  top: 0;
  background: var(--sdmx-color-bg-surface);
  z-index: 1;
}

.programmer-conflicts {
  padding: 0 var(--sdmx-space-sm) var(--sdmx-space-sm);
}

.programmer-scratch-list {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  padding: 0 var(--sdmx-space-sm) var(--sdmx-space-sm);
}

.programmer-scratch-row {
  display: grid;
  grid-template-columns: auto 1fr minmax(120px, 2fr);
  align-items: center;
  gap: var(--sdmx-space-sm);
  padding: var(--sdmx-space-xs) var(--sdmx-space-sm);
  min-height: var(--sdmx-space-touch);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  background: var(--sdmx-color-bg-elevated);
  cursor: pointer;
}

.programmer-scratch-row--active {
  border-color: var(--sdmx-color-active);
  box-shadow: inset 3px 0 0 var(--sdmx-color-active);
}

.programmer-scratch-row--pinned {
  border-color: var(--sdmx-color-armed);
  box-shadow: inset 3px 0 0 var(--sdmx-color-armed);
}

.programmer-scratch-row--conflict {
  background: color-mix(in srgb, var(--sdmx-color-warning), transparent 88%);
}

.programmer-scratch-row--untouched {
  opacity: 0.85;
  border-style: dashed;
}

.programmer-operator-chip {
  width: 10px;
  height: 10px;
  border-radius: var(--sdmx-radius-full);
  border: 1px solid color-mix(in srgb, var(--sdmx-color-text) 20%, transparent);
}

.programmer-scratch-row__name {
  font-weight: 600;
  font-size: var(--sdmx-font-size-body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.programmer-scratch-row__control {
  min-width: 0;
}
</style>
