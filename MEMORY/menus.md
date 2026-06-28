# Frontend Native Menus (`createMenu`)

This document describes how to create and trigger native desktop context menus in the SoftDMX frontend using the `createMenu` utility.

---

## 🚀 Overview

To maintain a consistent and native desktop feel, SoftDMX utilizes Electron's native menu APIs. While the low-level communication is handled over a tRPC subscription bridge (see [tRPC Electron IPC & Native Menus](./ipc-trpc.md)), the frontend provides a high-level, developer-friendly wrapper: **`createMenu`**.

The `createMenu` helper is defined in [menus.ts](file:///Volumes/Storage/Repos/GitHub/softdmx/packages/frontend/src/lib/menus.ts). It encapsulates:
1. Mapping click callbacks to unique string identifiers (`clickId`).
2. Serializing the menu template.
3. Subscribing to `trpc.showContextMenu`.
4. Cleaning up and unsubscribing when the menu is closed.

---

## 📋 Typing and Menu Item Options

Menu templates are arrays of `FrontendMenuItem`, which is declared globally in [env.d.ts](file:///Volumes/Storage/Repos/GitHub/softdmx/packages/frontend/src/env.d.ts).

### `FrontendMenuItem` Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `label` | `string` | The text label for the menu item. |
| `sublabel` | `string` | An optional sublabel (usually displayed on macOS below/next to the label). |
| `type` | `'normal' \| 'separator' \| 'submenu' \| 'checkbox' \| 'radio'` | The type of the menu item. Defaults to `'normal'`. |
| `role` | `string` | Standard Electron roles (e.g. `'undo'`, `'redo'`, `'copy'`, `'paste'`, `'close'`, `'quit'`). See `env.d.ts` for a full list. |
| `enabled` | `boolean` | Whether the item is clickable/interactive. Defaults to `true`. |
| `visible` | `boolean` | Whether the item is visible in the menu. Defaults to `true`. |
| `checked` | `boolean` | Whether a checkbox or radio item is selected. |
| `icon` | `string` | An optional icon name or path. |
| `toolTip` | `string` | Hover description for the menu item. |
| `accelerator` | `string` | Keyboard shortcut (e.g., `'CmdOrCtrl+S'`). |
| `id` | `string` | An optional unique identifier. |
| `click` | `() => void` | Callback function executed on the frontend when the item is clicked. |
| `submenu` | `FrontendMenuItem[]` | An array of nested menu items to render as a submenu. |

---

## 💻 How to Use `createMenu`

### 1. Basic Example
Import `createMenu` and pass your template configuration. Calling `.show()` displays the menu.

```typescript
import { createMenu } from 'src/lib/menus';

const menu = createMenu([
    {
        label: 'Save Project',
        accelerator: 'CmdOrCtrl+S',
        click: () => {
            console.log('Saving project...');
        }
    },
    {
        type: 'separator'
    },
    {
        label: 'Enable Output',
        type: 'checkbox',
        checked: true,
        click: () => {
            console.log('Toggled output');
        }
    }
]);

// Opens the native menu at the current mouse cursor location
menu.show();
```

### 2. Submenus
You can nest menus using the `submenu` field:

```typescript
const menu = createMenu([
    {
        label: 'Layouts',
        submenu: [
            {
                label: 'Performance Layout',
                click: () => loadLayout('performance')
            },
            {
                label: 'Programming Layout',
                click: () => loadLayout('programming')
            }
        ]
    }
]);
```

### 3. Positioning
By default, calling `menu.show()` shows the menu at the current mouse pointer coordinates. You can also specify custom `(x, y)` coordinates:

```typescript
// Position the menu at specific coordinates
menu.show(100, 250);
```

---

## ⚠️ Important Guidelines and Gotchas

### 1. Callback Closures and Reactivity
Because click callbacks are executed within the frontend context after being signaled from the backend, closures retain full access to local Vue variables, Pinia stores, and refs.

Ensure you interact with reactive state inside callbacks safely:
```typescript
const count = ref(0);

const menu = createMenu([
    {
        label: 'Increment',
        click: () => {
            count.value++; // Fully reactive, Vue will detect the change!
        }
    }
]);
```

### 2. Automatic Cleanup & Memory Leak Prevention
Under the hood, `createMenu` manages subscription lifecycles to prevent memory leaks.
* When Electron closes the menu, it emits a `close` event.
* The `createMenu` subscription handler captures this event, schedules a brief delay (100ms) to ensure any pending `click` callback has had time to process, and then clears its callback maps and calls `subscription.unsubscribe()`.
* No manual cleanup is required by developers.

---

## 🔗 See Also
* **[tRPC Electron IPC & Native Menus](./ipc-trpc.md)**: Deep dive into the under-the-hood tRPC serialization, the Electron Main router, and the `Symbol.asyncDispose` gotcha.
* **[Workspace Memory Index](./context.md)**: Workspace index.
