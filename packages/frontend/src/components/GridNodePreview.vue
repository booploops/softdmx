<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useGridNodeOverlayStore } from 'src/stores/gridnode-overlay';
import { SdmxStatusChip, SdmxEmptyState } from 'src/components/ui';

const gridNode = useGridNodeOverlayStore();
</script>

<template>
  <div class="gridnode-preview sdmx-panel sdmx-panel--inset">
    <div class="gridnode-preview__header">
      <span class="sdmx-text-label">VRChat / VRSL Preview</span>
      <SdmxStatusChip
        :label="gridNode.overlayVisible ? 'Live' : 'Off'"
        :variant="gridNode.overlayVisible ? 'active' : 'default'"
        icon="hub"
      />
    </div>
    <div class="gridnode-preview__body">
      <SdmxEmptyState
        v-if="!gridNode.overlayVisible"
        icon="hub"
        title="GridNode overlay disabled"
        hint="Enable GridNode in the sidebar to preview VRChat/VRSL fixture state."
      />
      <div v-else class="gridnode-preview__live">
        <div class="gridnode-preview__pulse" />
        <span class="sdmx-text-body">Streaming fixture state to virtual world</span>
        <span class="sdmx-text-caption">GridNode overlay active — fixtures mirror to VRSL</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gridnode-preview {
  padding: var(--sdmx-space-md);
}

.gridnode-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sdmx-space-sm);
}

.gridnode-preview__body {
  min-height: 80px;
}

.gridnode-preview__live {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-md);
  text-align: center;
}

.gridnode-preview__pulse {
  width: 12px;
  height: 12px;
  border-radius: var(--sdmx-radius-full);
  background: var(--sdmx-color-active);
  animation: sdmx-flash-pulse var(--sdmx-motion-duration-slow) var(--sdmx-motion-easing) infinite alternate;
}
</style>
