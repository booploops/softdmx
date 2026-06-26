<script setup lang="ts">
const tokens = [
  { name: 'bg-page', var: '--sdmx-color-bg-page' },
  { name: 'bg-surface', var: '--sdmx-color-bg-surface' },
  { name: 'bg-elevated', var: '--sdmx-color-bg-elevated' },
  { name: 'primary', var: '--sdmx-color-primary' },
  { name: 'scratch', var: '--sdmx-color-scratch' },
  { name: 'gm', var: '--sdmx-color-gm' },
  { name: 'active', var: '--sdmx-color-active' },
  { name: 'armed', var: '--sdmx-color-armed' },
  { name: 'flash', var: '--sdmx-color-flash' },
  { name: 'blind', var: '--sdmx-color-blind' },
  { name: 'positive', var: '--sdmx-color-positive' },
  { name: 'negative', var: '--sdmx-color-negative' },
];
</script>

<template>
  <Story title="Design Tokens/Colors" group="tokens">
    <Variant title="Semantic palette">
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; padding: 16px;">
        <div v-for="token in tokens" :key="token.var" style="text-align: center;">
          <div
            :style="{
              background: `var(${token.var})`,
              height: '48px',
              borderRadius: 'var(--sdmx-radius-sm)',
              border: '1px solid var(--sdmx-color-border-subtle)',
            }"
          />
          <span class="sdmx-text-caption">{{ token.name }}</span>
        </div>
      </div>
    </Variant>
    <Variant title="Typography scale">
      <div style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
        <span class="sdmx-text-display">Display — 20px bold</span>
        <span class="sdmx-text-title">Title — 16px bold</span>
        <span class="sdmx-text-body">Body — 14px</span>
        <span class="sdmx-text-label">Label — 12px</span>
        <span class="sdmx-text-caption">Caption — 11px muted</span>
        <span class="sdmx-text-mono">Mono tabular — 255</span>
      </div>
    </Variant>
  </Story>
</template>
