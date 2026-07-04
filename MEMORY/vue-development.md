# Vue & Pinia Development Guide

This document outlines the development guidelines for Vue 3 and Pinia within the `@softdmx/frontend` package, with a specific focus on import conventions and auto-import features.

---

## 🚀 Auto-Imports in `.vue` Files

To reduce boilerplates and keep component files clean, SoftDMX uses `unplugin-auto-import` for all Vue Single File Components (SFCs).

### Core Rule
Inside **`.vue` files**, do **not** write explicit imports for standard functions from `vue` or `pinia`.

* **Auto-imported from `vue`**:
  * Reactivity APIs: `ref`, `computed`, `reactive`, `readonly`, `shallowRef`, `toRef`, `toRefs`, `unref`
  * Watchers: `watch`, `watchEffect`
  * Lifecycle Hooks: `onMounted`, `onUnmounted`, `onBeforeUnmount`, `onUpdated`, etc.
  * Dependency Injection: `provide`, `inject`
  * Next Tick: `nextTick`
* **Auto-imported from `pinia`**:
  * `defineStore`, `storeToRefs`, `acceptHMRUpdate`, etc.

### Example in a `.vue` file:

```vue
<!-- CORRECT: No explicit import for ref, computed, onMounted, or storeToRefs -->
<script setup lang="ts">
const count = ref(0);
const double = computed(() => count.value * 2);

onMounted(() => {
  console.log("Component mounted");
});
</script>
```

---

## 💻 Explicit Imports in `.ts` Files

The auto-import behavior is strictly limited to files ending in `.vue`. 

### Core Rule
Inside standard **`.ts` files** (such as Pinia stores, router config, or standalone TypeScript utilities), you **must** write explicit imports for all Vue and Pinia APIs.

### Example in a `.ts` file:

```typescript
// CORRECT: Explicit imports are required in .ts files
import { ref, computed } from "vue";
import { defineStore } from "pinia";

export const useCounterStore = defineStore("counter", () => {
  const count = ref(0);
  const double = computed(() => count.value * 2);
  
  return { count, double };
});
```

---

## 🛠️ Configuration Details

This mechanism is defined in [vite.config.ts](file:///Volumes/Storage/Repos/GitHub/softdmx/packages/frontend/vite.config.ts) through `unplugin-auto-import/vite`:

```typescript
AutoImport({
  include: [/\.vue$/, /\.vue\?vue/],
  imports: ["vue", "pinia"],
})
```

### TypeScript and IDE Support
* The build tool automatically maintains global type declarations in `packages/frontend/auto-imports.d.ts`.
* This file is included in `tsconfig.json` so that the TypeScript compiler and IDEs recognize these functions as globals without displaying errors.
* If you introduce a new global or if autocomplete is not working, verify that `packages/frontend/auto-imports.d.ts` is generated and that your IDE has loaded the tsconfig project.

---

## 🧩 Component Auto-Imports (`X` Controls)

In addition to API functions, SoftDMX auto-imports custom controls. 

Any component stored under `src/components/controls/` (prefixed with `X`, such as `XButton`, `XInput`, `XSlider`, etc.) is managed by `unplugin-vue-components`.
* You **do not** need to import these controls explicitly in `.vue` files.
* You **do not** need to register them in the `components` options.
* Simply use them in your template (e.g. `<XButton>Click Me</XButton>`).

---

## 🎨 Styling with UnoCSS

SoftDMX utilizes **UnoCSS** for high-performance, utility-first styling.

### Configuration
* We use the **`presetWind4`** preset (which provides Tailwind v4 / Windi CSS compatibility).

### Styling Rules & Best Practices
* **Always prefer UnoCSS utility classes** over utility classes from third-party packages (such as Quasar).
* Using UnoCSS utility classes keeps our styles lightweight, consistent, and easy to maintain across custom components.
