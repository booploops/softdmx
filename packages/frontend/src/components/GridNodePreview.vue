<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
<script setup lang="ts">
import { useGridNodeOverlayStore } from 'src/stores/gridnode-overlay';

const gridNode = useGridNodeOverlayStore();
</script>

<template>
  <XWell class="gridnode-preview">
    <div class="gridnode-preview__header">
      <span class="gridnode-preview__label">VRChat / VRSL Preview</span>
      <XChip
        :label="gridNode.overlayVisible ? 'Live' : 'Off'"
        :color="gridNode.overlayVisible ? 'active' : 'default'"
        dense
        size="sm"
        icon="git-branch"
      />
    </div>
    <div class="gridnode-preview__body">
      <div
        v-if="!gridNode.overlayVisible"
        class="gridnode-preview__empty"
      >
        <XIcon
          name="git-branch"
          size="2rem"
          class="gridnode-preview__empty-icon"
        />
        <div class="gridnode-preview__empty-title">GridNode overlay disabled</div>
        <div class="gridnode-preview__empty-hint">
          Enable GridNode in the sidebar to preview VRChat/VRSL fixture state.
        </div>
      </div>
      <div
        v-else
        class="gridnode-preview__live"
      >
        <div class="gridnode-preview__pulse" />
        <span class="gridnode-preview__live-title">Streaming fixture state to virtual world</span>
        <span class="gridnode-preview__live-caption">GridNode overlay active — fixtures mirror to VRSL</span>
      </div>
    </div>
  </XWell>
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

.gridnode-preview__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--sdmx-color-text-muted);
}

.gridnode-preview__body {
  min-height: 80px;
}

.gridnode-preview__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--sdmx-space-md);
  text-align: center;
}

.gridnode-preview__empty-icon {
  color: var(--sdmx-color-text-muted);
  margin-bottom: 4px;
}

.gridnode-preview__empty-title {
  font-weight: 600;
}

.gridnode-preview__empty-hint {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
  max-width: 280px;
}

.gridnode-preview__live {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sdmx-space-xs);
  padding: var(--sdmx-space-md);
  text-align: center;
}

.gridnode-preview__live-title {
  font-size: 13px;
}

.gridnode-preview__live-caption {
  font-size: 12px;
  color: var(--sdmx-color-text-muted);
}

.gridnode-preview__pulse {
  width: 12px;
  height: 12px;
  border-radius: var(--sdmx-radius-full);
  background: var(--sdmx-color-active);
  animation: sdmx-flash-pulse var(--sdmx-motion-duration-slow) var(--sdmx-motion-easing) infinite alternate;
}
</style>
