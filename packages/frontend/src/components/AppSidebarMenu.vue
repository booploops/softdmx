<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { Dialog } from 'quasar';
import { useShowStore } from 'src/stores/show';
import { useUIStore } from 'src/stores/ui';
import { useGridNodeOverlayStore } from 'src/stores/gridnode-overlay';
import {
  showSettingsDialog,
  showInterfaceSettingsDialog,
  showThemeSettingsDialog,
  showAudioSettingsDialog,
  showBindingsDialog,
} from 'src/lib/CommonDialogs';
import {
  QUICK_ACCESS_WORKSPACE_MODES,
  SETUP_SECTION_META,
  PROGRAM_SECTION_META,
  WORKSPACE_MODE_META,
  type SetupSection,
  type ProgramSection,
} from 'src/desk/workspace-modes';
import { exampleVrClubShow } from 'src/shows/example-vr-club';
import { simpleWashShow } from 'src/shows/simple-wash';
import { laserDemoShow } from 'src/shows/laser-demo';

const ui = useUIStore();
const showStore = useShowStore();
const gridNodeOverlay = useGridNodeOverlayStore();

function selectMode(mode: typeof QUICK_ACCESS_WORKSPACE_MODES[number]) {
  ui.setMode(mode);
  ui.toggleLeftDrawer(false);
}

function selectSetup(section: SetupSection) {
  ui.setSetupSection(section);
  ui.toggleLeftDrawer(false);
}

function selectProgram(section: ProgramSection) {
  ui.setProgramSection(section);
  ui.toggleLeftDrawer(false);
}

function reloadExampleShow() {
  showStore.loadShow(exampleVrClubShow);
  ui.toggleLeftDrawer(false);
}

function loadSimpleWash() {
  showStore.loadShow(simpleWashShow);
  ui.toggleLeftDrawer(false);
}

function loadLaserDemo() {
  showStore.loadShow(laserDemoShow);
  ui.toggleLeftDrawer(false);
}

function exportShow() {
  const ok = showStore.downloadShow();
  if (!ok) Dialog.create({ title: 'Export Failed', message: 'Could not export show file.' });
  ui.toggleLeftDrawer(false);
}

function importShow() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.yml,.yaml';
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      await showStore.loadShowFromFile(file);
    } catch (error) {
      Dialog.create({
        title: 'Import Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
  input.click();
  ui.toggleLeftDrawer(false);
}

function openCueEditor() {
  ui.openDialog('cueEditor');
  ui.toggleLeftDrawer(false);
}

function handleShowSettingsDialog() {
  ui.toggleLeftDrawer(false);
  showSettingsDialog();
}

function handleShowInterfaceSettingsDialog() {
  ui.toggleLeftDrawer(false);
  showInterfaceSettingsDialog();
}

function handleShowThemeSettingsDialog() {
  ui.toggleLeftDrawer(false);
  showThemeSettingsDialog();
}

function handleShowAudioSettingsDialog() {
  ui.toggleLeftDrawer(false);
  showAudioSettingsDialog();
}

function handleShowBindingsDialog() {
  ui.toggleLeftDrawer(false);
  showBindingsDialog();
}
</script>

<template>
  <div class="sidebar-menu">
    <q-list padding dense>
      <q-item-label header>Workspace</q-item-label>
      <q-item
        v-for="mode in QUICK_ACCESS_WORKSPACE_MODES"
        :key="mode"
        clickable
        @click="selectMode(mode)"
      >
        <q-item-section avatar><q-icon :name="WORKSPACE_MODE_META[mode].icon" /></q-item-section>
        <q-item-section>{{ WORKSPACE_MODE_META[mode].label }}</q-item-section>
        <q-item-section v-if="ui.mode === mode" side><q-icon name="check" color="primary" /></q-item-section>
      </q-item>

      <template v-if="ui.isProgram">
        <q-separator spaced />
        <q-item-label header>Program sections</q-item-label>
        <q-item
          v-for="(meta, section) in PROGRAM_SECTION_META"
          :key="section"
          clickable
          :active="ui.programSection === section"
          active-class="sidebar-active"
          @click="selectProgram(section as ProgramSection)"
        >
          <q-item-section avatar><q-icon :name="meta.icon" /></q-item-section>
          <q-item-section>{{ meta.label }}</q-item-section>
        </q-item>
      </template>

      <template v-if="ui.isSetup">
        <q-separator spaced />
        <q-item-label header>Setup sections</q-item-label>
        <q-item
          v-for="(meta, section) in SETUP_SECTION_META"
          :key="section"
          clickable
          :active="ui.setupSection === section"
          active-class="sidebar-active"
          @click="selectSetup(section as SetupSection)"
        >
          <q-item-section avatar><q-icon :name="meta.icon" /></q-item-section>
          <q-item-section>{{ meta.label }}</q-item-section>
        </q-item>
      </template>

      <q-separator spaced />
      <q-item-label header>Show file</q-item-label>
      <q-item clickable @click="reloadExampleShow">
        <q-item-section avatar><q-icon name="refresh" /></q-item-section>
        <q-item-section>Reload example show</q-item-section>
      </q-item>
      <q-item clickable @click="loadSimpleWash">
        <q-item-section avatar><q-icon name="light_mode" /></q-item-section>
        <q-item-section>Load simple wash</q-item-section>
      </q-item>
      <q-item clickable @click="loadLaserDemo">
        <q-item-section avatar><q-icon name="flash_on" /></q-item-section>
        <q-item-section>Load laser demo</q-item-section>
      </q-item>
      <q-item clickable @click="exportShow">
        <q-item-section avatar><q-icon name="download" /></q-item-section>
        <q-item-section>Export YAML</q-item-section>
      </q-item>
      <q-item clickable @click="importShow">
        <q-item-section avatar><q-icon name="upload" /></q-item-section>
        <q-item-section>Import YAML</q-item-section>
      </q-item>

      <q-separator spaced />
      <q-item-label header>Tools</q-item-label>
      <q-item clickable @click="openCueEditor">
        <q-item-section avatar><q-icon name="movie_edit" /></q-item-section>
        <q-item-section>Cue editor</q-item-section>
      </q-item>
      <q-item clickable @click="handleShowBindingsDialog">
        <q-item-section avatar><q-icon name="tune" /></q-item-section>
        <q-item-section>Bindings</q-item-section>
      </q-item>
      <q-item clickable @click="handleShowAudioSettingsDialog">
        <q-item-section avatar><q-icon name="graphic_eq" /></q-item-section>
        <q-item-section>Audio analysis</q-item-section>
      </q-item>

      <q-separator spaced />
      <q-item-label header>Output</q-item-label>
      <q-item clickable @click="handleShowSettingsDialog">
        <q-item-section avatar><q-icon name="settings_input_component" /></q-item-section>
        <q-item-section>Output &amp; sync</q-item-section>
      </q-item>
      <q-item v-if="gridNodeOverlay.isAvailable" clickable @click="gridNodeOverlay.toggle()">
        <q-item-section avatar><q-icon name="grid_view" /></q-item-section>
        <q-item-section>GridNode overlay</q-item-section>
        <q-item-section side>
          <q-toggle
            :model-value="gridNodeOverlay.overlayVisible"
            color="primary"
            dense
            @update:model-value="gridNodeOverlay.setVisible"
            @click.stop
          />
        </q-item-section>
      </q-item>

      <q-separator spaced />
      <q-item-label header>Settings</q-item-label>
      <q-item clickable @click="handleShowInterfaceSettingsDialog">
        <q-item-section avatar><q-icon name="dashboard_customize" /></q-item-section>
        <q-item-section>Interface</q-item-section>
      </q-item>
      <q-item clickable @click="handleShowThemeSettingsDialog">
        <q-item-section avatar><q-icon name="palette" /></q-item-section>
        <q-item-section>Theme</q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<style scoped lang="scss">
.sidebar-menu { min-height: 100%; }
.sidebar-active { background: var(--sdmx-color-selected); }
</style>
