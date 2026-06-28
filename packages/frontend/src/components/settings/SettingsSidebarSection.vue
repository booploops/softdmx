<script setup lang="ts">
import { computed } from 'vue';
import XCard from 'src/components/controls/XCard.vue';
import XSelect from 'src/components/controls/XSelect.vue';
import XSwitch from 'src/components/controls/XSwitch.vue';
import { SIDEBAR_SHORTCUTS } from 'src/lib/sidebar-shortcuts';
import { useUIStore } from 'src/stores/ui';

const uiStore = useUIStore();

const openModeOptions = [
  { label: 'Open in current workspace', value: 'current-workspace' },
  { label: 'Open in a new workspace', value: 'new-workspace' },
] as const;

const newWorkspacePolicyOptions = [
  { label: 'Always create a new workspace', value: 'always-new' },
  { label: 'Reuse workspace if component is already open', value: 'reuse-existing' },
] as const;

const enabledShortcutIds = computed(() =>
  Array.isArray(uiStore.sidebarShortcutIds) ? uiStore.sidebarShortcutIds : []
);

function isShortcutEnabled(id: string): boolean {
  return enabledShortcutIds.value.includes(id as never);
}

function setShortcutEnabled(id: string, value: boolean) {
  if (typeof uiStore.toggleSidebarShortcut === 'function') {
    uiStore.toggleSidebarShortcut(id as never, value);
    return;
  }

  if (typeof uiStore.setSidebarShortcutIds === 'function') {
    const next = value
      ? [...enabledShortcutIds.value, id as never]
      : enabledShortcutIds.value.filter((entry) => entry !== id);
    uiStore.setSidebarShortcutIds(next as never);
  }
}
</script>

<template>
  <div class="q-pa-md">
    <XCard title="Sidebar Behavior">
      <div class="behavior-layout">
        <div class="behavior-layout__left q-gutter-y-md">
          <div class="text-body2 text-grey-5">
            Add quick-launch icons to the workspace sidebar for frequently used panels.
          </div>

          <XSelect
            :model-value="uiStore.sidebarShortcutOpenMode"
            :options="openModeOptions"
            label="Shortcut launch behavior"
            @update:model-value="(value) => uiStore.setSidebarShortcutOpenMode(value)"
          />

          <XSelect
            :model-value="uiStore.sidebarShortcutNewWorkspacePolicy"
            :options="newWorkspacePolicyOptions"
            label="New workspace policy"
            :disable="uiStore.sidebarShortcutOpenMode !== 'new-workspace'"
            @update:model-value="(value) => uiStore.setSidebarShortcutNewWorkspacePolicy(value)"
          />
        </div>

        <div class="behavior-layout__right q-gutter-y-sm">
          <div class="shortcut-row">
            <div class="shortcut-label">
              <span>Show operate lock icon</span>
            </div>
            <XSwitch
              :model-value="uiStore.showOperateLockIcon"
              @update:model-value="uiStore.toggleShowOperateLockIcon"
            />
          </div>

          <div
            v-for="shortcut in SIDEBAR_SHORTCUTS"
            :key="shortcut.id"
            class="shortcut-row"
          >
            <div class="shortcut-label">
              <i :class="`codicon codicon-${shortcut.icon}`" aria-hidden="true" />
              <span>{{ shortcut.label }}</span>
            </div>
            <XSwitch
              :model-value="isShortcutEnabled(shortcut.id)"
              @update:model-value="(value) => setShortcutEnabled(shortcut.id, value)"
            />
          </div>
        </div>
      </div>
    </XCard>
  </div>
</template>

<style scoped lang="scss">
.behavior-layout {
  display: grid;
  grid-template-columns: minmax(260px, 0.95fr) minmax(320px, 1.05fr);
  gap: 16px;
  align-items: start;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.shortcut-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--sdmx-color-text);

  .codicon {
    color: var(--sdmx-color-text-muted);
  }
}

@media (max-width: 900px) {
  .behavior-layout {
    grid-template-columns: 1fr;
  }
}
</style>
