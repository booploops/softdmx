<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useCueStore } from 'src/stores/cue';
import { useUIStore } from 'src/stores/ui';

const cueStore = useCueStore();
const ui = useUIStore();

function openCueEditor() {
  ui.openDialog('cueEditor');
}
</script>

<template>
  <div class="cue-list-panel">
    <div class="cue-list-panel__header">
      <div class="text-h6">Cues</div>
      <div class="cue-list-panel__actions">
        <XButton
          v-info="'desk.cueList.add'"
          color="primary"
          icon="plus"
          label="New cue"
          @click="cueStore.addCue(`Cue ${cueStore.cues.length + 1}`)"
        />
        <XButton
          v-info="'desk.cueList.openEditor'"
          flat
          icon="movie"
          label="Cue editor"
          @click="openCueEditor"
        />
      </div>
    </div>

    <XListView
      bordered
      separator
      class="cue-list-panel__list"
    >
      <XListItem
        v-for="cue in cueStore.cues"
        :key="cue.id"
        clickable
        :active="cueStore.activeCueId === cue.id"
        @click="cueStore.activeCueId = cue.id"
      >
        <div class="cue-list-panel__item-main">
          <div class="cue-list-panel__name">{{ cue.name }}</div>
          <div class="cue-list-panel__caption">{{ cue.view === 'stack' ? 'Stack' : 'Timeline' }}</div>
        </div>
        <template #append>
          <div class="cue-list-panel__item-actions">
            <XButton
              v-info="'desk.cueList.play'"
              flat
              size="sm"
              icon="player-play-filled"
              @click.stop="cueStore.playCue(cue.id)"
            />
            <XButton
              v-info="'desk.cueList.stop'"
              flat
              size="sm"
              color="danger"
              icon="square"
              @click.stop="cueStore.stopCue(cue.id)"
            />
          </div>
        </template>
      </XListItem>

      <XListItem
        v-if="!cueStore.cues.length"
        :clickable="false"
      >
        <span class="cue-list-panel__empty">No cues yet</span>
      </XListItem>
    </XListView>
  </div>
</template>

<style scoped>
.cue-list-panel {
  padding: var(--sdmx-space-md, 16px);
}

.cue-list-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.cue-list-panel__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cue-list-panel__list {
  max-height: none;
}

.cue-list-panel__item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.cue-list-panel__name {
  font-weight: 500;
}

.cue-list-panel__caption {
  font-size: 11px;
  color: var(--sdmx-color-text-muted);
}

.cue-list-panel__item-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.cue-list-panel__empty {
  color: var(--sdmx-color-text-muted);
}
</style>
