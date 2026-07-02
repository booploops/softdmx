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
import { useInfoText } from 'src/composables/useInfoText';

const deskView = useDeskViewStore();
const ui = useUIStore();
const { info } = useInfoText();
</script>

<template>
  <div class="view-switcher row items-center q-gutter-x-xs">
    <q-btn-dropdown
      v-info="'desk.views.switch'"
      dense
      flat
      no-caps
      :label="deskView.activeView.name"
      icon="layout-quilt"
    >
      <q-list dense style="min-width: 160px">
        <q-item
          v-for="view in deskView.views"
          :key="view.id"
          clickable
          v-close-popup
          :active="deskView.activeViewId === view.id"
          active-class="bg-primary text-white"
          @click="deskView.setActiveView(view.id)"
        >
          <q-item-section>{{ view.name }}</q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
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
