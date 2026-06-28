<script setup lang="ts">
import { inject, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    clickable?: boolean;
    active?: boolean;
    disable?: boolean;
    dense?: boolean;
  }>(),
  {
    clickable: true,
    active: false,
    disable: false,
    dense: false,
  }
);

const emit = defineEmits<{ click: [MouseEvent] }>();

// Inject list context if inside XListView
const parentProps = inject<{ dense?: boolean } | null>('listViewProps', null);

const isDense = computed(() => {
  return props.dense || (parentProps?.dense ?? false);
});

const classes = computed(() => [
  'x-list-item',
  {
    'x-list-item--clickable': props.clickable && !props.disable,
    'x-list-item--active': props.active,
    'x-list-item--disabled': props.disable,
    'x-list-item--dense': isDense.value,
  },
]);

function onClick(event: MouseEvent) {
  if (props.disable || !props.clickable) return;
  emit('click', event);
}
</script>

<template>
  <div :class="classes" @click="onClick">
    <div v-if="$slots.prepend" class="x-list-item__prepend">
      <slot name="prepend"></slot>
    </div>
    
    <div class="x-list-item__main">
      <slot></slot>
    </div>

    <div v-if="$slots.append" class="x-list-item__append">
      <slot name="append"></slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.x-list-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  color: #1d1d1f;
  user-select: none;
  line-height: 1.3;

  &--dense {
    padding: 4px 8px;
    font-size: 12px;
  }

  // Prepend & Append slots
  &__prepend {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 8px;
    color: #8e8e93;
  }

  &__main {
    flex: 1 1 0;
    min-width: 0;
  }

  &__append {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 8px;
    color: #8e8e93;
    font-size: 11px;
  }

  // Active / Selected state (macOS Catalina accent blue)
  &--active {
    background-color: #007aff !important;
    color: #ffffff !important;

    .x-list-item__prepend,
    .x-list-item__append {
      color: rgba(255, 255, 255, 0.8) !important;
    }
  }

  // Clickable & Hover states
  &--clickable {
    cursor: default;

    &:hover:not(.x-list-item--active) {
      background-color: #e8e8ed;
    }
  }

  // Zebra striping styles, targeting items inside zebra list view
  :global(.x-list-view--zebra) &:nth-child(even):not(.x-list-item--active):not(:hover) {
    background-color: #f5f5f7;
  }

  // Disabled state
  &--disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>

<style lang="scss">
/* Global dark mode overrides for XListItem inside .body--dark */
.body--dark {
  .x-list-item {
    color: #f5f5f7 !important;

    .x-list-item__prepend,
    .x-list-item__append {
      color: #a1a1aa !important;
    }

    &.x-list-item--active {
      background-color: #0a84ff !important;
      color: #ffffff !important;
      
      .x-list-item__prepend,
      .x-list-item__append {
        color: rgba(255, 255, 255, 0.8) !important;
      }
    }

    &.x-list-item--clickable {
      &:hover:not(.x-list-item--active) {
        background-color: #2d2d2d !important;
      }
    }

    /* Zebra striping support inside zebra-styled lists */
    :global(.x-list-view--zebra) &:nth-child(even):not(.x-list-item--active):not(:hover) {
      background-color: #252525 !important;
    }
  }
}
</style>
