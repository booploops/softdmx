/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BrowserWindow, ipcMain } from "electron";
import abletonlink from "abletonlink";

let link: InstanceType<typeof abletonlink> | null = null;
let mainWindowRef: BrowserWindow | null = null;
let lastBeat = -1;
let ipcRegistered = false;

function onSetBpm(_event: Electron.IpcMainEvent, targetBpm: number) {
  if (link && typeof targetBpm === "number" && targetBpm > 0) {
    link.bpm = targetBpm;
  }
}

function onSetEnabled(_event: Electron.IpcMainEvent, enabled: boolean) {
  if (!link) return;
  if (enabled) {
    link.enable();
  } else {
    link.disable();
  }
}

export function setupAbletonLink(mainWindow: BrowserWindow) {
  if (link) {
    mainWindowRef = mainWindow;
    return;
  }

  try {
    link = new abletonlink();
    mainWindowRef = mainWindow;

    link.on("numPeers", (numPeers: number) => {
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send("link-peers-changed", numPeers);
      }
    });

    link.startUpdate(60, (beat: number, phase: number, bpm: number) => {
      if (!mainWindowRef || mainWindowRef.isDestroyed()) return;

      const currentBeatFloor = Math.floor(beat);
      const isNewBeat = currentBeatFloor !== lastBeat;

      if (isNewBeat) {
        lastBeat = currentBeatFloor;
      }

      mainWindowRef.webContents.send("link-tick", {
        beat,
        phase,
        bpm,
        isNewBeat,
        numPeers: link!.numPeers,
      });
    });

    if (!ipcRegistered) {
      ipcMain.on("link-set-bpm", onSetBpm);
      ipcMain.on("link-set-enabled", onSetEnabled);
      ipcRegistered = true;
    }

    console.log("Ableton Link initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Ableton Link:", error);
  }
}

export function closeAbletonLink() {
  if (!link) return;

  mainWindowRef = null;
  lastBeat = -1;

  try {
    link.stopUpdate();
    link.off("numPeers");
    link.off("tempo");
    link.off("playState");
    link.disable();
    console.log("Ableton Link shut down successfully");
  } catch (error) {
    console.error("Error shutting down Ableton Link:", error);
  }

  link = null;

  if (ipcRegistered) {
    ipcMain.removeListener("link-set-bpm", onSetBpm);
    ipcMain.removeListener("link-set-enabled", onSetEnabled);
    ipcRegistered = false;
  }
}
