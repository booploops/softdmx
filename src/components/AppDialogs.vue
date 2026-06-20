<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useUIStore } from 'src/stores/ui';
import SettingsDialog from './SettingsDialog.vue';
import InterfaceSettingsDialog from './InterfaceSettingsDialog.vue';
import ThemeSettingsDialog from './ThemeSettingsDialog.vue';
import AudioSettingsDialog from './AudioSettingsDialog.vue';
import BindingsPanel from './BindingsPanel.vue';

const ui = useUIStore();

const settingsOpen = computed({
  get: () => ui.dialogs.settings,
  set: (value: boolean) => (value ? ui.openDialog('settings') : ui.closeDialog('settings')),
});
const bindingsOpen = computed({
  get: () => ui.dialogs.bindings,
  set: (value: boolean) => (value ? ui.openDialog('bindings') : ui.closeDialog('bindings')),
});
const interfaceOpen = computed({
  get: () => ui.dialogs.interface,
  set: (value: boolean) => (value ? ui.openDialog('interface') : ui.closeDialog('interface')),
});
const themeOpen = computed({
  get: () => ui.dialogs.theme,
  set: (value: boolean) => (value ? ui.openDialog('theme') : ui.closeDialog('theme')),
});
const audioOpen = computed({
  get: () => ui.dialogs.audio,
  set: (value: boolean) => (value ? ui.openDialog('audio') : ui.closeDialog('audio')),
});
</script>

<template>
  <q-dialog v-model="settingsOpen">
    <SettingsDialog @close="ui.closeDialog('settings')" />
  </q-dialog>

  <q-dialog v-model="interfaceOpen">
    <InterfaceSettingsDialog @close="ui.closeDialog('interface')" />
  </q-dialog>

  <q-dialog v-model="themeOpen">
    <ThemeSettingsDialog @close="ui.closeDialog('theme')" />
  </q-dialog>

  <q-dialog v-model="audioOpen">
    <AudioSettingsDialog @close="ui.closeDialog('audio')" />
  </q-dialog>

  <q-dialog v-model="bindingsOpen">
    <BindingsPanel @close="ui.closeDialog('bindings')" />
  </q-dialog>
</template>
