<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import {
  SETUP_SECTION_META,
  type SetupSection,
} from 'src/desk/workspace-modes';
import { useUIStore } from 'src/stores/ui';

const ui = useUIStore();
const sections = Object.entries(SETUP_SECTION_META) as [SetupSection, { label: string; icon: string }][];
</script>

<template>
  <q-list padding dense class="setup-nav">
    <q-item-label header>Setup</q-item-label>
    <q-item
      v-for="[section, meta] in sections"
      :key="section"
      clickable
      :active="ui.setupSection === section"
      active-class="sidebar-active"
      @click="ui.setSetupSection(section)"
    >
      <q-item-section avatar><q-icon :name="meta.icon" /></q-item-section>
      <q-item-section>{{ meta.label }}</q-item-section>
    </q-item>
  </q-list>
</template>

<style scoped>
.sidebar-active {
  background: var(--sdmx-color-selected);
}
</style>
