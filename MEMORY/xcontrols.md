# Custom Controls (XControls) Guide

This guide details the design system, accessibility requirements, and development guidelines for creating and modifying the custom controls suite (`X*` prefix) located in `packages/frontend/src/components/controls`.

---

## 1. Design System: Flat Big Sur Aesthetic

All custom components follow the modern, flat design style of macOS Big Sur. We strictly avoid the glossy textures, heavy vertical gradients, and inset inner borders of earlier macOS eras (e.g., Catalina).

### Color Palettes
* **Light Mode:**
  * Default Background: Solid White (`#ffffff`) or Light Gray (`#f5f5f7` / `#ececec`).
  * Default Borders: Thin, transparent gray boundaries (`rgba(0, 0, 0, 0.15)` or `rgba(0, 0, 0, 0.2)`).
  * System Accent (Primary Blue): `#007aff`.
  * Success Green: `#34c759`.
  * Danger Red: `#ff3b30`.
  * Default Text: `#1d1d1f`.
* **Dark Mode:**
  * Default Background: Translucent overlay (`rgba(255, 255, 255, 0.1)`) or solid dark gray (`#1a1a1a` / `#212121`).
  * Default Borders: Translucent white boundaries (`rgba(255, 255, 255, 0.15)`).
  * System Accent (Primary Blue): `#0a84ff`.
  * Success Green: `#30d158`.
  * Danger Red: `#ff453a`.
  * Default Text: `#f5f5f7`.

### Instantaneous Interaction Fills
To keep interactions feeling fast, responsive, and performance-optimized, **do not write transition styles**. 
* Avoid `transition: all ...` or `transition: background-color ...`.
* State changes (hover, active, focus, toggle) must render instantly.

---

## 2. Keyboard Navigation & Accessibility (A11y)

All controls must be fully usable via standard keyboard navigation (Tab and arrow keys).

### Tab Sequence & Dynamic Focus
1. **Disabled States:** Any element in a disabled state (`disable` or `readonly`) must be removed from the tab focus sequence. Use dynamic `tabindex` attributes:
   ```vue
   :tabindex="disable ? -1 : 0"
   ```
2. **Native Wrappers:** For complex UI components (such as selects), prefer rendering a native control (like `<select>` or `<input>`) styled invisibly (`opacity: 0`) overlaying the stylized graphics. This naturally preserves native focus, tab flow, and screen reader announcements.

### Keydown Event Listeners
Custom interactive elements (such as divs/spans acting as headers, checkboxes, or list items) must listen for and act on standard accessibility keys:
* **Space & Enter:** Use `@keydown.space.prevent` and `@keydown.enter.prevent` to execute the action handler.
* **Escape:** Dropdowns and overlay panels must listen for `@keydown.esc` to automatically dismiss/close.
* **Arrow Keys / Home / End:** Sliders, ranges, and selectors must support incrementing, decrementing, or resetting values.

### Focus Outline Style
Focused controls must clearly display focus rings to keyboard users.
* Use the CSS `:focus-visible` pseudo-class to ensure rings are only displayed when focused via keyboard.
* **Standard Blue Focus Ring CSS:**
  ```scss
  &:focus-visible {
    box-shadow: 0 0 0 2.5px rgba(0, 122, 255, 0.5) !important;
  }
  ```
  *(In dark mode, use `rgba(10, 132, 255, 0.5)` for the system blue accent focus ring).*

---

## 3. Component Architecture Patterns

* **Self-Containment:** Controls must handle their own internal states (like dropdown open overlays, click-outside closures, and scrollable panels) independently without relying on third-party frameworks like Quasar's `<q-menu>` where possible.
* **Flexibility & Layout:**
  * Sizing props should support `sm` (height `20px`), `md` (height `24px`), and `lg` (height `32px`).
  * Containment elements should provide simple options: `<XCard>` for default structured layouts, and `<XWell>` for inset sidebar groupings.

---

## 4. MPL v2.0 License Headers

Every file in the controls suite must start with the Mozilla Public License v2.0 header. 

### For Vue SFC (`.vue`) files:
Place this HTML comment block at the very top (before `<script>` or `<template>`):
```html
<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
```

### For TypeScript/JavaScript (`.ts` / `.js`) files:
Place this block comment at the very top:
```typescript
/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
```
