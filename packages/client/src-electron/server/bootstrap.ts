/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { serveStatic } from "@hono/node-server/serve-static";
import { join } from "path";
import { fileURLToPath } from "node:url";
import { getDevUrl, isDev } from "../runtime/env";
import { AppState } from "../state/main";
import { registerRemoteRestRoutes } from "./api/remote-rest";
import { attachChannelPipeline } from "./socket/channels";
import { registerRemoteHandlers } from "./socket/remote";
import { registerSettingsHandlers } from "./socket/settings";
import { app, createRemoteContext, httpServer, io, outputManager } from "./context";

import { effect } from "alien-signals";
import { showStore } from "../state/show";

let serverStarted = false;
let showEffectDisposer: (() => void) | null = null;

export function startServer() {
  if (serverStarted) return;
  serverStarted = true;

  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const assetsPath = join(__dirname, "../dist/spa");

  AppState.io = io;

  app.use("/app/*", serveStatic({
    root: "./",
    rewriteRequestPath: (path) => path.replace(/^\/app/, assetsPath),
  }));

  app.get("/source", (c) => {
    if (isDev()) {
      return c.redirect(getDevUrl() + "/#/artnet");
    }
    return c.redirect("/app/index.html#/artnet");
  });

  const remoteContext = createRemoteContext();

  registerRemoteRestRoutes(app, remoteContext);
  attachChannelPipeline(io, outputManager);
  httpServer.listen(AppState.port);

  showEffectDisposer = effect(() => {
    const doc = showStore.document();
    const dirty = showStore.isDirty();
    const path = showStore.filePath();
    const undo = showStore.undoStack();
    const redo = showStore.redoStack();

    // Keep outputManager in sync
    outputManager.setShowfile(doc);

    // Broadcast legacy show:state
    io.emit("show:state", doc);

    // Broadcast new show:state-sync
    io.emit("show:state-sync", {
      document: doc,
      isDirty: dirty,
      filePath: path,
      undoStack: undo,
      redoStack: redo,
    });
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Immediately send the newly connected client the latest show state
    socket.emit("show:state-sync", {
      document: showStore.document(),
      isDirty: showStore.isDirty(),
      filePath: showStore.filePath(),
      undoStack: showStore.undoStack(),
      redoStack: showStore.redoStack(),
    });

    registerSettingsHandlers(socket, remoteContext);
    registerRemoteHandlers(socket, remoteContext);
  });

  console.log("Server started on port 5353");
  console.log("WebSocket server started on port 5353");
}

export async function stopServer() {
  if (showEffectDisposer) {
    showEffectDisposer();
    showEffectDisposer = null;
  }

  if (!serverStarted) {
    await outputManager.destroy();
    return;
  }

  serverStarted = false;

  await outputManager.destroy();

  await new Promise<void>((resolve) => {
    io.close(() => resolve());
  });

  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
  AppState.io = null;
}
