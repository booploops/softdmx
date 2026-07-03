/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { app, Menu, BrowserWindow, type MenuItemConstructorOptions } from "electron";

/**
 * Registers a global listener on all webContents. Whenever a "context-menu" event is triggered,
 * it builds and displays a standard context menu for editable fields or selected text.
 */
export function registerGlobalContextMenuHandler() {
  app.on("web-contents-created", (_event, webContents) => {
    webContents.on("context-menu", (_e, params) => {
      const { isEditable, selectionText, editFlags } = params;
      const menuTemplate: MenuItemConstructorOptions[] = [];

      if (isEditable) {
        menuTemplate.push(
          { role: "undo", enabled: editFlags.canUndo },
          { role: "redo", enabled: editFlags.canRedo },
          { type: "separator" },
          { role: "cut", enabled: editFlags.canCut },
          { role: "copy", enabled: editFlags.canCopy },
          { role: "paste", enabled: editFlags.canPaste },
          { type: "separator" },
          { role: "selectAll", enabled: editFlags.canSelectAll },
        );
      } else if (selectionText && selectionText.trim() !== "") {
        menuTemplate.push(
          { role: "copy", enabled: editFlags.canCopy },
        );
      } else {
        // Not editable and no active selection, nothing to display
        return;
      }

      const menu = Menu.buildFromTemplate(menuTemplate);
      const win = BrowserWindow.fromWebContents(webContents);

      menu.popup({
        window: win ?? undefined,
      });
    });
  });
}
