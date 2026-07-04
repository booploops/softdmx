<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

<script setup lang="ts">
import { computed } from "vue";
import * as tablerIcons from "@tabler/icons-vue";

const props = defineProps<{
  /**
   * Tabler Icon name
   */
  name?: string;
  size?: string | number;
  color?: string;
}>();

const tablerIconComponent = computed(() => {
  if (!props.name) return null;

  // Resolve to PascalCase (e.g. alert-triangle -> IconAlertTriangle, circle -> IconCircle)
  const pascalName =
    "Icon" +
    props.name
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");

  const comp = (tablerIcons as any)[pascalName];
  if (comp) return comp;

  // Return fallback
  return tablerIcons.IconQuestionMark;
});

const sizeVal = computed(() => {
  if (!props.size) return 20; // default size
  const sizeMap: Record<string, number> = {
    xs: 12,
    sm: 15,
    md: 18,
    lg: 24,
    xl: 32,
  };
  if (typeof props.size === "string" && sizeMap[props.size] !== undefined) {
    return sizeMap[props.size];
  }
  // If it's a string like "24px" or "1.5rem", strip px and parse if possible
  if (typeof props.size === "string" && props.size.endsWith("px")) {
    const val = parseFloat(props.size);
    if (!isNaN(val)) return val;
  }
  return props.size;
});

const strokeWidth = computed(() => {
  if (typeof sizeVal.value === "number") {
    if (sizeVal.value <= 14) return 2.5;
  }
  return 2;
});

const classes = computed(() => {
  const list = ["x-icon"];
  if (props.color) {
    if (props.color.startsWith("text-")) {
      list.push(props.color);
    } else {
      list.push(`text-${props.color}`);
    }
  }
  return list;
});
</script>

<template>
  <component
    :is="tablerIconComponent"
    v-if="tablerIconComponent"
    :size="sizeVal"
    :stroke-width="strokeWidth"
    :class="classes"
  />
</template>

<style scoped>
.x-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
