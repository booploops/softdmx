<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<!--
  Purpose: Toolbar for widgets view with view mode toggle
-->
<script setup lang="ts">
import { useUIStore } from 'src/stores/ui';
import { useDMXStore } from 'src/stores/dmx';

const ui = useUIStore();
const dmx = useDMXStore();

const hasGroups = computed(() => {
  return (dmx.showfile?.linkedGroups || []).length > 0;
});
</script>

<template>
  <div class="widgets-toolbar" v-show="ui.currentTab === 'widgets' && hasGroups">
    <div class="toolbar-content">
      <span class="toolbar-label">View Mode:</span>
      <q-btn-group rounded unelevated>
        <q-btn
          @click="ui.widgetsViewMode = 'groups'"
          :class="{
            'bg-primary text-white': ui.widgetsViewMode === 'groups',
          }"
          icon="group_work"
          size="sm"
        >
          Groups
        </q-btn>
        <q-btn
          @click="ui.widgetsViewMode = 'individual'"
          :class="{
            'bg-primary text-white': ui.widgetsViewMode === 'individual',
          }"
          icon="widgets"
          size="sm"
        >
          Individual
        </q-btn>
      </q-btn-group>
    </div>
  </div>
</template>

<style scoped lang="scss">
.widgets-toolbar {
  background: var(--q-dark);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 16px;

  .toolbar-content {
    display: flex;
    align-items: center;
    gap: 12px;

    .toolbar-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 500;
    }
  }
}
</style>
