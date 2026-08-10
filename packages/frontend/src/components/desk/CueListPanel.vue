<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import type { Cue } from '@softdmx/engine';
import { SdmxEmptyState, SdmxStatusChip } from 'src/components/ui';
import { useCueStore } from 'src/stores/cue';
import { useUIStore } from 'src/stores/ui';
import { ref } from 'vue';

const cueStore = useCueStore();
const ui = useUIStore();

const showAddCueDialog = ref(false);
const newCueName = ref('');
const newCueView = ref<'timeline' | 'stack'>('timeline');
const cueViewOptions = [
  { label: 'Timeline', value: 'timeline' },
  { label: 'Stack', value: 'stack' },
];

function openCueEditor(cueId?: string) {
  if (cueId) cueStore.activeCueId = cueId;
  ui.openDialog('cueEditor');
  // Avoid focus returning to the card with a visible focus ring after Esc closes the dialog.
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function selectCue(cueId: string) {
  cueStore.activeCueId = cueId;
}

function onCueActivate(cue: Cue) {
  openCueEditor(cue.id);
}

function openAddCueDialog() {
  newCueName.value = `Cue ${cueStore.cues.length + 1}`;
  newCueView.value = 'timeline';
  showAddCueDialog.value = true;
}

function addCue() {
  const name = newCueName.value.trim();
  if (!name) return;
  cueStore.addCue(name, newCueView.value);
  newCueName.value = '';
  newCueView.value = 'timeline';
  showAddCueDialog.value = false;
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
          @click="openAddCueDialog"
        />
        <XButton
          v-info="'desk.cueList.openEditor'"
          flat
          icon="movie"
          label="Cue editor"
          @click="openCueEditor()"
        />
      </div>
    </div>

    <div
      v-if="cueStore.cues.length"
      class="cue-list-panel__grid"
    >
      <div
        v-for="cue in cueStore.cues"
        :key="cue.id"
        role="button"
        tabindex="0"
        class="cue-card sdmx-focus-ring"
        :class="{ 'cue-card--active': cueStore.activeCueId === cue.id }"
        @click="selectCue(cue.id)"
        @dblclick="onCueActivate(cue)"
        @keydown.enter.prevent="onCueActivate(cue)"
        @keydown.space.prevent="selectCue(cue.id)"
      >
        <div class="cue-card__top">
          <div class="cue-card__title">{{ cue.name }}</div>
          <SdmxStatusChip
            :label="cue.view === 'stack' ? 'Stack' : 'Timeline'"
            :variant="cue.view === 'stack' ? 'armed' : 'info'"
          />
        </div>
        <div class="cue-card__meta sdmx-text-caption sdmx-text-mono">
          Priority {{ cue.priority ?? 0 }}
          <span v-if="cue.isLooping"> · Loop</span>
        </div>
        <div
          class="cue-card__actions"
          @click.stop
          @dblclick.stop
        >
          <XButton
            v-info="'desk.cueList.play'"
            flat
            size="sm"
            icon="player-play-filled"
            @click="cueStore.playCue(cue.id)"
          />
          <XButton
            v-info="'desk.cueList.stop'"
            flat
            size="sm"
            color="danger"
            icon="square"
            @click="cueStore.stopCue(cue.id)"
          />
        </div>
      </div>
    </div>

    <SdmxEmptyState
      v-else
      icon="movie"
      title="No cues yet"
      hint="Create a cue as a timeline or stack, then double-click it to open the editor."
    >
      <XButton
        color="primary"
        icon="plus"
        label="New cue"
        @click="openAddCueDialog"
      />
    </SdmxEmptyState>

    <XDialog v-model="showAddCueDialog">
      <XDialogHeader title="New Cue" />
      <XDialogBody class="cue-list-panel__dialog-body">
        <XInput
          v-model="newCueName"
          label="Cue name"
          autofocus
          @keyup.enter="addCue"
        />
        <XSelect
          v-model="newCueView"
          :options="cueViewOptions"
          emit-value
          map-options
          label="Cue type"
        />
      </XDialogBody>
      <XDialogFooter>
        <XButton
          flat
          label="Cancel"
          color="default"
          @click="showAddCueDialog = false"
        />
        <XButton
          color="primary"
          label="Create"
          :disable="!newCueName.trim()"
          @click="addCue"
        />
      </XDialogFooter>
    </XDialog>
  </div>
</template>

<style scoped>
.cue-list-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: var(--sdmx-space-md);
  gap: var(--sdmx-space-md);
  overflow: hidden;
}

.cue-list-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sdmx-space-md);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.cue-list-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-sm);
}

.cue-list-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--sdmx-space-sm);
  align-content: start;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-bottom: var(--sdmx-space-sm);
}

.cue-card {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-sm);
  min-width: 0;
  min-height: var(--sdmx-space-touch);
  padding: var(--sdmx-space-md);
  border: 1px solid var(--sdmx-color-border-subtle);
  border-radius: var(--sdmx-radius-md);
  background: var(--sdmx-color-bg-elevated);
  color: var(--sdmx-color-text);
  text-align: left;
  cursor: pointer;
}

.cue-card:hover {
  background: var(--sdmx-color-hover);
  border-color: var(--sdmx-color-border);
}

.cue-card--active {
  border-color: var(--sdmx-color-primary);
  background: var(--sdmx-color-primary-soft);
}

/* Active selection already signals focus; don't stack a second outline after dialog close. */
.cue-card--active:focus-visible {
  outline: none;
}

.cue-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sdmx-space-sm);
}

.cue-card__title {
  font-weight: var(--sdmx-font-weight-bold);
  font-size: var(--sdmx-font-size-label);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.cue-card__meta {
  color: var(--sdmx-color-text-muted);
}

.cue-card__actions {
  display: flex;
  align-items: center;
  gap: var(--sdmx-space-xs);
  margin-top: auto;
}

.cue-list-panel__dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--sdmx-space-md);
  min-width: min(360px, 80vw);
}
</style>
