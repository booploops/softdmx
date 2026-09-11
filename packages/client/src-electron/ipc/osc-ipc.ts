/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BrowserWindow, ipcMain } from "electron";
import { Client, Server } from "node-osc";

let oscServer: Server | null = null;
let oscClient: Client | null = null;
let sendHandlerRegistered = false;

export function setupOscListener(mainWindow: BrowserWindow) {
  try {
    // Listen on port 8000, bind to all interfaces
    oscServer = new Server(8000, "0.0.0.0", () => {
      console.log("OSC Server listening on port 8000");
    });

    oscServer.on("message", (msg) => {
      if (!msg || !Array.isArray(msg) || msg.length === 0) return;

      const [address, ...args] = msg;

      // Forward to Vue renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("osc-received", { address, args });
      }
    });

    oscServer.on("error", (err) => {
      console.error("OSC Server encountered an error:", err);
    });

    oscClient = new Client("127.0.0.1", 9000);
    if (!sendHandlerRegistered) {
      sendHandlerRegistered = true;
      ipcMain.on("osc-send", (_event, payload: { address?: string; args?: unknown[] }) => {
        if (!oscClient || typeof payload?.address !== "string") return;
        const args = Array.isArray(payload.args) ? payload.args : [];
        oscClient.send(payload.address, ...(args as Array<string | number | boolean>));
      });
    }
  } catch (error) {
    console.error("Failed to start OSC Server:", error);
  }
}

export function closeOscListener() {
  if (oscServer) {
    try {
      oscServer.close();
      console.log("OSC Server shut down successfully");
    } catch (error) {
      console.error("Error shutting down OSC Server:", error);
    }
    oscServer = null;
  }
  if (oscClient) {
    try {
      oscClient.close();
    } catch (error) {
      console.error("Error shutting down OSC Client:", error);
    }
    oscClient = null;
  }
}
