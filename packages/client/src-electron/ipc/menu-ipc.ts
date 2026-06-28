/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Menu, BrowserWindow, ipcMain, type IpcMainEvent, type MenuItemConstructorOptions } from "electron";

export interface SerializedMenuItem {
  clickId?: string;
  role?: string;
  type?: "normal" | "separator" | "submenu" | "checkbox" | "radio";
  label?: string;
  sublabel?: string;
  toolTip?: string;
  accelerator?: string;
  icon?: string;
  enabled?: boolean;
  visible?: boolean;
  checked?: boolean;
  id?: string;
  submenu?: SerializedMenuItem[];
}

export interface ShowMenuOptions {
  template: SerializedMenuItem[];
  x?: number;
  y?: number;
}

let ipcRegistered = false;

function convertTemplate(
  items: SerializedMenuItem[],
  window: BrowserWindow
): MenuItemConstructorOptions[] {
  return items.map((item) => {
    const menuItem: MenuItemConstructorOptions = {
      role: item.role as any,
      type: item.type,
      label: item.label,
      sublabel: item.sublabel,
      toolTip: item.toolTip,
      accelerator: item.accelerator,
      enabled: item.enabled,
      visible: item.visible,
      checked: item.checked,
      id: item.id,
    };

    if (item.clickId) {
      menuItem.click = () => {
        if (!window.isDestroyed()) {
          window.webContents.send("menu-item-clicked", item.clickId);
        }
      };
    }

    if (item.submenu) {
      menuItem.submenu = convertTemplate(item.submenu, window);
    }

    return menuItem;
  });
}

function onShowContextMenu(event: IpcMainEvent, options: ShowMenuOptions): void {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const menu = Menu.buildFromTemplate(convertTemplate(options.template, win));
  menu.popup({
    window: win,
    x: options.x,
    y: options.y,
    callback: () => {
      if (!win.isDestroyed()) {
        win.webContents.send("menu-closed");
      }
    },
  });
}

export function setupMenuIpc(): void {
  if (ipcRegistered) return;

  ipcMain.on("show-context-menu", onShowContextMenu);
  ipcRegistered = true;
}

export function closeMenuIpc(): void {
  if (!ipcRegistered) return;

  ipcMain.removeListener("show-context-menu", onShowContextMenu);
  ipcRegistered = false;
}
