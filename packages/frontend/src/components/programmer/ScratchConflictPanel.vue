<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useScratchConflicts } from 'src/composables/useScratchConflicts';
import { SdmxButton, SdmxEmptyState } from 'src/components/ui';

const { conflicts, resolveAcceptMine, resolveAcceptTheirs, resolveUseMerged } = useScratchConflicts();
</script>

<template>
  <div class="scratch-conflict-panel">
    <SdmxEmptyState
      v-if="conflicts.length === 0"
      icon="circle-check"
      title="No scratch conflicts"
      hint="All operators agree on scratched channels."
    />
    <div v-else class="scratch-conflict-panel__list">
      <div
        v-for="conflict in conflicts"
        :key="conflict.path"
        class="scratch-conflict-panel__item"
      >
        <div class="scratch-conflict-panel__head">
          <div class="text-weight-bold ellipsis">{{ conflict.attributeName ?? conflict.path.split('/').pop() }}</div>
          <div class="text-caption text-grey-5 ellipsis">{{ conflict.path }}</div>
        </div>
        <div class="scratch-conflict-panel__clients">
          <div
            v-for="client in conflict.clients"
            :key="`${conflict.path}-${client.clientId}`"
            class="scratch-conflict-panel__client"
          >
            <span
              class="scratch-conflict-panel__chip"
              :style="{ backgroundColor: client.color ?? 'var(--sdmx-color-border-subtle)' }"
            />
            <span class="text-caption">{{ client.operatorLabel ?? client.clientId }}</span>
            <span class="text-caption text-weight-bold sdmx-text-mono">{{ client.value }}</span>
          </div>
        </div>
        <div class="scratch-conflict-panel__actions">
          <SdmxButton size="sm" variant="ghost" label="Mine" @click="resolveAcceptMine(conflict)" />
          <SdmxButton size="sm" variant="ghost" label="Theirs" @click="resolveAcceptTheirs(conflict)" />
          <SdmxButton
            v-if="conflict.mergedValue !== undefined"
            size="sm"
            variant="ghost"
            :label="`Merged (${conflict.mergedValue})`"
            @click="resolveUseMerged(conflict)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.scratch-conflict-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  min-height: 0;
}

.scratch-conflict-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-xs);
  overflow: auto;
}

.scratch-conflict-panel__item {
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-sm);
  padding: var(--sdmx-space-xs);
  background: var(--sdmx-color-bg-surface);
}

.scratch-conflict-panel__clients {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sdmx-space-xs);
  margin-top: var(--sdmx-space-xs);
}

.scratch-conflict-panel__client {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.scratch-conflict-panel__chip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.scratch-conflict-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sdmx-space-xs);
  margin-top: var(--sdmx-space-xs);
}
</style>
