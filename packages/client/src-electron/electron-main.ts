/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { app, BrowserWindow, Menu, dialog } from "electron";
import { fileURLToPath } from "url";
import { startServer, stopServer } from "./server";
import { AppState } from "./state/main";
import { Paths } from "./runtime/paths";
import { closeOscListener } from "./ipc/osc-ipc";
import { closeAbletonLink } from "./ipc/link-ipc";
import { setupGridNodeOverlayIpc, closeGridNodeOverlayIpc } from "./ipc/gridnode-ipc";
import { closeVideoIpc } from "./ipc/video-ipc";
import { createIPCHandler } from "electron-trpc-experimental/main";
import { appRouter, createContext } from "./ipc/trpc-router";
import { isOutputNodeMode } from "./modes/output-node";
import { createMainWindow } from "./windows/main-window";
import { createOutputNodeWindow } from "./windows/output-node-window";
import { config } from "./state/config";
import { workspace } from "./state/workspace";
import { createApplicationMenu } from "./windows/application-menu";
import { registerGlobalContextMenuHandler } from "./windows/context-menu";


app.setPath("userData", Paths.appData);
app.commandLine.appendSwitch("disable-smooth-scrolling");

const currentDir = fileURLToPath(new URL(".", import.meta.url));

let mainWindow: BrowserWindow | undefined;
let shutdownStarted = false;
let shutdownComplete = false;

function destroyAuxiliaryWindows() {
  if (AppState.artnetWindow && !AppState.artnetWindow.isDestroyed()) {
    AppState.artnetWindow.destroy();
  }
  AppState.artnetWindow = null;
}

async function runShutdownCleanup() {
  await stopServer();
  closeOscListener();
  closeAbletonLink();
  closeGridNodeOverlayIpc();
  await closeVideoIpc();
  destroyAuxiliaryWindows();
}

async function shutdownAndQuit() {
  if (shutdownStarted) return;
  shutdownStarted = true;

  await runShutdownCleanup();

  // Give native ThreadSafeFunction callbacks and the Link worker thread time to drain.
  await new Promise((resolve) => setTimeout(resolve, 200));

  shutdownComplete = true;
  app.quit();
}

async function createWindow() {
  config.load();
  workspace.load();
  startServer();
  setupGridNodeOverlayIpc();

  // Install custom global Application Menu
  Menu.setApplicationMenu(createApplicationMenu());

  // Setup standard global right-click context menu (Undo, Redo, Cut, Copy, Paste, Select All)
  registerGlobalContextMenuHandler();


  const trpcHandler = createIPCHandler({
    router: appRouter,
    createContext,
  });

  if (isOutputNodeMode()) {
    mainWindow = await createOutputNodeWindow(currentDir);
  } else {
    mainWindow = await createMainWindow(currentDir);
  }

  trpcHandler.attachWindow(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = undefined;
    void shutdownAndQuit();
  });
}

void app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  void shutdownAndQuit();
});

app.on("before-quit", (event) => {
  if (shutdownComplete) return;
  if (!shutdownStarted) {
    const choice = dialog.showMessageBoxSync({
      type: "question",
      buttons: ["Yes, Quit", "Cancel"],
      defaultId: 0,
      cancelId: 1,
      title: "Confirm Quit",
      message: "Are you sure you want to quit SoftDMX?",
      detail: "Unsaved changes may be lost.",
    });

    if (choice === 1) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    void shutdownAndQuit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
