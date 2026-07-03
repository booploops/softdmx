<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useDeskViewStore } from 'src/stores/desk-view';
import { useUIStore } from 'src/stores/ui';
import { SdmxButton } from 'src/components/ui';
import XButton from 'src/components/controls/XButton.vue';
import XIcon from 'src/components/controls/XIcon.vue';
import { useInfoText } from 'src/composables/useInfoText';
import { createMenu } from 'src/lib/menus';

const deskView = useDeskViewStore();
const ui = useUIStore();
const { info } = useInfoText();

function showViewMenu() {
  const menu = createMenu(
    deskView.views.map((view) => ({
      label: view.name,
      type: 'checkbox',
      checked: deskView.activeViewId === view.id,
      click: () => {
        deskView.setActiveView(view.id);
      },
    }))
  );
  menu.show();
}
</script>

<template>
  <div class="view-switcher row items-center q-gutter-x-xs">
    <XButton
      v-info="'desk.views.switch'"
      flat
      size="sm"
      @click="showViewMenu"
    >
      <XIcon name="layout-quilt" size="sm" />
      <span>{{ deskView.activeView?.name ?? '' }}</span>
      <svg viewBox="0 0 10 6" class="x-dropdown__arrow">
        <path d="M5 6L0 0H10L5 6Z" fill="currentColor" />
      </svg>
    </XButton>
    <SdmxButton
      v-if="ui.isLive && !ui.operateLocked"
      icon="device-floppy"
      size="sm"
      variant="ghost"
      :info="info('desk.views.saveDefault')"
      @click="deskView.saveDefaultViewPreference()"
    />
  </div>
</template>

<style scoped lang="scss">
.x-dropdown__arrow {
  width: 8px;
  height: 5px;
  margin-left: 2px;
  opacity: 0.7;
}
</style>

