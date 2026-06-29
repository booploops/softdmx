/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fastifyStatic } from "@fastify/static";
import { join } from "path";
import { fileURLToPath } from "node:url";
import { getDevUrl, isDev } from "../runtime/env";
import { AppState } from "../state/main";
import { registerRemoteRestRoutes } from "./api/remote-rest";
import { attachChannelPipeline } from "./socket/channels";
import { registerRemoteHandlers } from "./socket/remote";
import { registerSettingsHandlers } from "./socket/settings";
import { createRemoteContext, httpServer, io, outputManager } from "./context";

let serverStarted = false;

export function startServer() {
  if (serverStarted) return;
  serverStarted = true;

  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const assetsPath = join(__dirname, "../dist/spa");

  AppState.io = io;

  httpServer.register(fastifyStatic, {
    root: assetsPath,
    prefix: "/app/",
  });

  httpServer.get("/source", (req, reply) => {
    if (isDev()) {
      reply.redirect(getDevUrl() + "/#/artnet");
      return;
    }
    reply.redirect("/app/index.html#/artnet");
  });

  const remoteContext = createRemoteContext();

  registerRemoteRestRoutes(httpServer, remoteContext);
  attachChannelPipeline(io, outputManager);
  httpServer.listen({ port: AppState.port, ipv6Only: false });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    registerSettingsHandlers(socket, remoteContext);
    registerRemoteHandlers(socket, remoteContext);
  });

  console.log("Server started on port 5353");
  console.log("WebSocket server started on port 5353");
}

export async function stopServer() {
  if (!serverStarted) {
    await outputManager.destroy();
    return;
  }

  serverStarted = false;

  await outputManager.destroy();

  await new Promise<void>((resolve) => {
    io.close(() => resolve());
  });

  await httpServer.close();
  AppState.io = null;
}
