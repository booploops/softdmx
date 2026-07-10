<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import {
  PROGRAM_SECTION_META,
  type ProgramSection,
} from 'src/desk/workspace-modes';
import { useUIStore } from 'src/stores/ui';

const ui = useUIStore();

const sections = Object.entries(PROGRAM_SECTION_META) as [ProgramSection, { label: string; icon: string }][];
</script>

<template>
  <nav class="program-nav">
    <div class="program-nav__header">Program</div>
    <XListView
      :bordered="false"
      dense
      class="program-nav__list"
    >
      <XListItem
        v-for="[section, meta] in sections"
        :key="section"
        v-info="{ key: 'desk.nav.programSection', vars: { label: meta.label } }"
        clickable
        :active="ui.programSection === section"
        @click="ui.setProgramSection(section)"
      >
        <template #prepend>
          <XIcon :name="meta.icon" />
        </template>
        {{ meta.label }}
      </XListItem>
    </XListView>
  </nav>
</template>

<style scoped>
.program-nav__header {
  padding: 12px 12px 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--sdmx-color-text-muted);
}

.program-nav__list {
  max-height: none;
  background: transparent;
}
</style>
