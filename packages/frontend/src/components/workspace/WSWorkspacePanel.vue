<script setup lang="ts">
import { ref, watch } from 'vue';
import type { IDockviewPanelProps } from 'dockview-vue';
import WSPanelContent from './WSPanelContent.vue';
import { WorkspacePanels } from 'src/lib/workspace/panels.ts';

const props = defineProps<{
  params: IDockviewPanelProps<{ path: string }>;
}>();

// Initialize the path from params, ensuring leading slash
const initialPath = props.params.params?.path || 'test';
const path = ref(initialPath.startsWith('/') ? initialPath : `/${initialPath}`);

// Watch path changes (internal routing) and update dockview title if matching route has a name or title
watch(path, (newPath) => {
  const cleanPath = newPath.replace(/^\//, '');
  const matchedRoute = WorkspacePanels.find(
    (r) => r.path === cleanPath || r.path === newPath
  );
  if (matchedRoute) {
    const title = matchedRoute.name || matchedRoute.meta?.title || (cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1));
    props.params.api.setTitle(title);
  }
});
</script>

<template>
  <div class="ws-workspace-panel">
    <WSPanelContent v-model="path" />
  </div>
</template>

<style scoped lang="scss">
.ws-workspace-panel {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--sdmx-color-bg-surface);
  color: var(--sdmx-color-text);
}
</style>
