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
import XButton from 'src/components/controls/XButton.vue';
import XListView from 'src/components/controls/XListView.vue';
import XListItem from 'src/components/controls/XListItem.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';

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
    <XListView :bordered="false">
      <XButton
        @click="$router.push('/new-workspace')"
        label="Workspace View"
        color="primary"
        class="full-width q-mb-sm"
      ></XButton>
      <div class="sidebar-menu-header">Workspace</div>
      <XListItem
        v-for="mode in QUICK_ACCESS_WORKSPACE_MODES"
        :key="mode"
        v-info="{ key: 'desk.nav.workspaceMode', vars: { label: WORKSPACE_MODE_META[mode].label } }"
        clickable
        :active="ui.mode === mode"
        @click="selectMode(mode)"
      >
        <template #prepend><q-icon :name="WORKSPACE_MODE_META[mode].icon" /></template>
        {{ WORKSPACE_MODE_META[mode].label }}
        <template
          #append
          v-if="ui.mode === mode"
        >
          <q-icon
            name="check"
            color="primary"
          />
        </template>
      </XListItem>

      <template v-if="ui.isProgram">
        <hr class="sidebar-menu-separator" />
        <div class="sidebar-menu-header">Program sections</div>
        <XListItem
          v-for="(meta, section) in PROGRAM_SECTION_META"
          :key="section"
          v-info="{ key: 'desk.nav.programSection', vars: { label: meta.label } }"
          clickable
          :active="ui.programSection === section"
          @click="selectProgram(section as ProgramSection)"
        >
          <template #prepend><q-icon :name="meta.icon" /></template>
          {{ meta.label }}
        </XListItem>
      </template>

      <template v-if="ui.isSetup">
        <hr class="sidebar-menu-separator" />
        <div class="sidebar-menu-header">Setup sections</div>
        <XListItem
          v-for="(meta, section) in SETUP_SECTION_META"
          :key="section"
          v-info="{ key: 'desk.nav.setupSection', vars: { label: meta.label } }"
          clickable
          :active="ui.setupSection === section"
          @click="selectSetup(section as SetupSection)"
        >
          <template #prepend><q-icon :name="meta.icon" /></template>
          {{ meta.label }}
        </XListItem>
      </template>

      <hr class="sidebar-menu-separator" />
      <div class="sidebar-menu-header">Show file</div>
      <XListItem
        v-info="'desk.nav.reloadExample'"
        clickable
        @click="reloadExampleShow"
      >
        <template #prepend><q-icon name="refresh" /></template>
        Reload example show
      </XListItem>
      <XListItem
        v-info="'desk.nav.loadSimpleWash'"
        clickable
        @click="loadSimpleWash"
      >
        <template #prepend><q-icon name="light_mode" /></template>
        Load simple wash
      </XListItem>
      <XListItem
        v-info="'desk.nav.loadLaserDemo'"
        clickable
        @click="loadLaserDemo"
      >
        <template #prepend><q-icon name="flash_on" /></template>
        Load laser demo
      </XListItem>
      <XListItem
        v-info="'desk.nav.exportYaml'"
        clickable
        @click="exportShow"
      >
        <template #prepend><q-icon name="download" /></template>
        Export YAML
      </XListItem>
      <XListItem
        v-info="'desk.nav.importYaml'"
        clickable
        @click="importShow"
      >
        <template #prepend><q-icon name="upload" /></template>
        Import YAML
      </XListItem>

      <hr class="sidebar-menu-separator" />
      <div class="sidebar-menu-header">Tools</div>
      <XListItem
        v-info="'desk.nav.cueEditor'"
        clickable
        @click="openCueEditor"
      >
        <template #prepend><q-icon name="movie_edit" /></template>
        Cue editor
      </XListItem>
      <XListItem
        v-info="'desk.nav.bindings'"
        clickable
        @click="handleShowBindingsDialog"
      >
        <template #prepend><q-icon name="tune" /></template>
        Bindings
      </XListItem>
      <XListItem
        v-info="'desk.nav.audioAnalysis'"
        clickable
        @click="handleShowAudioSettingsDialog"
      >
        <template #prepend><q-icon name="graphic_eq" /></template>
        Audio analysis
      </XListItem>

      <hr class="sidebar-menu-separator" />
      <div class="sidebar-menu-header">Output</div>
      <XListItem
        v-info="'desk.nav.outputSync'"
        clickable
        @click="handleShowSettingsDialog"
      >
        <template #prepend><q-icon name="settings_input_component" /></template>
        Output &amp; sync
      </XListItem>
      <XListItem
        v-if="gridNodeOverlay.isAvailable"
        v-info="'desk.nav.gridNodeOverlay'"
        clickable
        @click="gridNodeOverlay.toggle()"
      >
        <template #prepend><q-icon name="grid_view" /></template>
        GridNode overlay
        <template #append>
          <XSwitch
            :model-value="gridNodeOverlay.overlayVisible"
            @update:model-value="gridNodeOverlay.setVisible"
            @click.stop
          />
        </template>
      </XListItem>

      <hr class="sidebar-menu-separator" />
      <div class="sidebar-menu-header">Settings</div>
      <XListItem
        v-info="'desk.nav.interfaceSettings'"
        clickable
        @click="handleShowInterfaceSettingsDialog"
      >
        <template #prepend><q-icon name="dashboard_customize" /></template>
        Interface
      </XListItem>
      <XListItem
        v-info="'desk.nav.themeSettings'"
        clickable
        @click="handleShowThemeSettingsDialog"
      >
        <template #prepend><q-icon name="palette" /></template>
        Theme
      </XListItem>
    </XListView>
  </div>
</template>

<style scoped lang="scss">
.sidebar-menu {
  min-height: 100%;
}

.sidebar-menu-header {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #8e8e93;
  letter-spacing: 0.5px;
}

.body--dark .sidebar-menu-header {
  color: #a1a1aa;
}

.sidebar-menu-separator {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  margin: 8px 0;
}

.body--dark .sidebar-menu-separator {
  border-top-color: rgba(255, 255, 255, 0.08);
}
</style>
