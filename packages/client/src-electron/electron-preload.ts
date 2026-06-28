/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { contextBridge, ipcRenderer } from "electron";
import { exposeElectronTRPC } from "electron-trpc-experimental/preload";

exposeElectronTRPC();

contextBridge.exposeInMainWorld("electronVideo", {
  listSenders: (): Promise<Array<{ name: string; appName?: string }>> =>
    ipcRenderer.invoke("video-list-senders"),
  connect: (config: {
    kind: "syphon" | "spout";
    senderName: string;
    fps: number;
  }): Promise<boolean> => ipcRenderer.invoke("video-connect", config),
  disconnect: (): Promise<void> => ipcRenderer.invoke("video-disconnect"),
  getStatus: (): Promise<{ connected: boolean; platform: string }> =>
    ipcRenderer.invoke("video-status"),
  onFrame: (callback: (payload: { width: number; height: number; data: ArrayBuffer }) => void) => {
    ipcRenderer.on("video-frame", (_event, payload) => callback(payload));
  },
  removeFrameListener: () => {
    ipcRenderer.removeAllListeners("video-frame");
  },
});


contextBridge.exposeInMainWorld("electronAPI", {
  getRemoteApiToken: (): string | undefined => {
    const token = process.env.SOFTDMX_API_TOKEN?.trim();
    return token && token.length > 0 ? token : undefined;
  },
  onOscMessage: (callback: (event: any, data: { address: string; args: any[] }) => void) => {
    ipcRenderer.on("osc-received", callback);
  },
  removeOscListener: () => {
    ipcRenderer.removeAllListeners("osc-received");
  },
});

contextBridge.exposeInMainWorld("electronGridNode", {
  setVisible: (visible: boolean) => {
    ipcRenderer.send("gridnode-overlay-set", visible);
  },
  getVisible: (): Promise<boolean> => ipcRenderer.invoke("gridnode-overlay-get"),
  onChanged: (callback: (event: Electron.IpcRendererEvent, visible: boolean) => void) => {
    ipcRenderer.on("gridnode-overlay-changed", callback);
  },
});

contextBridge.exposeInMainWorld("electronLink", {
  onTick: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on("link-tick", callback);
  },
  onPeersChanged: (callback: (event: any, numPeers: number) => void) => {
    ipcRenderer.on("link-peers-changed", callback);
  },
  setBpm: (bpm: number) => {
    ipcRenderer.send("link-set-bpm", bpm);
  },
  setEnabled: (enabled: boolean) => {
    ipcRenderer.send("link-set-enabled", enabled);
  },
});

/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 *
 * WARNING!
 * If accessing Node functionality (like importing @electron/remote) then in your
 * electron-main.ts you will need to set the following when you instantiate BrowserWindow:
 *
 * mainWindow = new BrowserWindow({
 *   // ...
 *   webPreferences: {
 *     // ...
 *     sandbox: false // <-- to be able to import @electron/remote in preload script
 *   }
 * }
 */
