# SoftDMX Agent Instructions & Rules

Welcome, Agent! This repository implements **SoftDMX**, a software lighting controller inspired by DMX512. It provides a user-friendly interface for controlling lighting fixtures and creating dynamic light shows.

To ensure consistent contributions and alignment with the architecture, you must follow the instructions below.

---

## 📂 Project Memory & Context (Read This First!)

Before writing any code or making architectural changes, you **MUST** read the files in the `MEMORY` directory to understand the core design, constraints, and technologies:

1. **[MEMORY/context.md](../MEMORY/context.md)**: Main workspace memory index and general monorepo pointers.
2. **[MEMORY/engine-architecture.md](../MEMORY/engine-architecture.md)**: Details the boundaries between `@softdmx/engine`, `@softdmx/frontend`, and `@softdmx/client`, and the **Delegation Lookup Pattern** for fixture resolution.
3. **[MEMORY/wasm-usage.md](../MEMORY/wasm-usage.md)**: Best practices for Zig WebAssembly (`@softdmx/wasm`) integration, zero-copy memory transfer, and browser Web Worker constraints.
4. **[MEMORY/testing.md](../MEMORY/testing.md)**: How tests are structured in `@softdmx/tests` and how path aliases are resolved.

---

## 🛠️ Technology Stack & Environment

* **Frontend**: Vue 3, Quasar Framework, SCSS, lodash-es, Pinia, UnoCSS (with the `presetWind4` preset; always prefer UnoCSS over Quasar utility classes).
* **Backend / Desktop**: Electron (backend resides in `packages/client/src-electron/` only).
* **Computation Engine**: WebAssembly built with Zig (`packages/wasm/`).
* **Package Management**: Yarn 4.

---

## 📜 Development Guidelines & Constraints

### 1. License Headers
All code files **must** contain the following MPL v2.0 header:

**TypeScript/JavaScript/CSS/SCSS:**
```ts
/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
```

**HTML/Vue Components:**
```html
<!--
  Copyright (C) 2025-Present booploops and contributors

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->
```

**Zig:**
```zig
///
/// Copyright (C) 2025-Present booploops and contributors
///
/// This Source Code Form is subject to the terms of the Mozilla Public
/// License, v. 2.0. If a copy of the MPL was not distributed with this
/// file, You can obtain one at https://mozilla.org/MPL/2.0/.
///
```

### 2. Side-Effect Free Engine
The `@softdmx/engine` package must remain entirely side-effect free and compatible with browser bundling. **Do not** import Node.js native standard libraries in `@softdmx/engine`.

### 3. Build & Test Commands
* Build the frontend and check for errors: `yarn build:frontend`
* Run development server (note: UI is only visible when run in correct environments): `yarn dev`
* Run test suites: `yarn test`

### 4. Styling with UnoCSS
We use **UnoCSS** with the **`presetWind4`** preset. Always prefer UnoCSS utility classes over existing utility classes from third-party packages (such as Quasar).

