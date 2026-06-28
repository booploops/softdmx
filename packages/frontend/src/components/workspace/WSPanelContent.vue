<script setup lang="ts">
import { PodRouter, Route } from '@booploops/pod-router';
import { WorkspacePanels } from 'src/lib/workspace-panels';

const path = defineModel<string>();

</script>

<template>
    <div>
        <PodRouter
            :routes="WorkspacePanels"
            v-model="path"
        ></PodRouter>
    </div>
</template>

<style scoped lang="scss"></style>