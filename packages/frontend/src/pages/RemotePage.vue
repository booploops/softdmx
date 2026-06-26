<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from 'vue';
import { useIOClient } from 'src/lib/io-client';
import type { ShowDocument } from '@softdmx/engine';
import { isSupportedShowVersion } from '@softdmx/engine';
import TouchSurface from 'src/components/touch/TouchSurface.vue';
import InfoModeProvider from 'src/components/ui/InfoModeProvider.vue';
import { SdmxStatusChip, SdmxEmptyState } from 'src/components/ui';

const socket = useIOClient();
const showDoc = ref<ShowDocument | null>(null);
const isConnected = ref(socket.connected);

const showName = computed(() => showDoc.value?.meta.name ?? 'Remote');
const touchPage = computed(() => showDoc.value?.touch?.pages[0] ?? null);

function requestCurrentState() {
  socket.emit('show:get');
}

function handleConnect() {
  isConnected.value = true;
  requestCurrentState();
}

function handleDisconnect() {
  isConnected.value = false;
}

function handleShowState(payload: ShowDocument) {
  if (isSupportedShowVersion(payload?.version)) {
    showDoc.value = payload;
  }
}

onMounted(() => {
  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
  socket.on('show:state', handleShowState);
  isConnected.value = socket.connected;
  requestCurrentState();
});

onBeforeUnmount(() => {
  socket.off('connect', handleConnect);
  socket.off('disconnect', handleDisconnect);
  socket.off('show:state', handleShowState);
});
</script>

<template>
  <InfoModeProvider>
    <div class="remote-page sdmx-remote-page">
      <header class="remote-header">
        <div class="title-block">
          <div class="sdmx-text-title">{{ showName }}</div>
          <div class="sdmx-text-caption">SoftDMX Touch</div>
        </div>
        <SdmxStatusChip
          :label="isConnected ? 'Online' : 'Offline'"
          :variant="isConnected ? 'positive' : 'negative'"
          info="Connection status to SoftDMX desk"
        />
      </header>
      <TouchSurface v-if="touchPage" :page="touchPage" />
      <SdmxEmptyState
        v-else
        icon="touch_app"
        title="No touch layout"
        hint="Configure a touch page in Program → Touch to use this remote."
      />
    </div>
  </InfoModeProvider>
</template>

<style scoped>
.remote-page {
  min-height: 100vh;
  padding: var(--sdmx-space-md);
  display: grid;
  gap: var(--sdmx-space-md);
}

.remote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
