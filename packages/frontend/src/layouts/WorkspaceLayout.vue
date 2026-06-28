<script setup lang="ts">
import XSidebarButton from 'src/components/controls/XSidebarButton.vue';


</script>

<template>
    <div class="workspace-shell">
        <div class="workspace-sidebar">
            <XSidebarButton>
                <i class="codicon codicon-menu" />
            </XSidebarButton>
            <XSidebarButton>
                <i class="codicon codicon-gear" />
            </XSidebarButton>
        </div>
        <div class="workspace-viewport">
            <router-view />
        </div>
    </div>
</template>

<style scoped lang="scss">
.workspace-shell {
    height: 100%;
    overflow: hidden;
    display: flex;
}

.workspace-sidebar {
    background: var(--sdmx-color-bg-drawer);
}

.workspace-viewport {
    container-type: inline-size;
    container-name: viewport;
    flex: 1;
    border-radius: 8px;
    overflow-x: hidden;
    overflow-y: auto;
}
</style>