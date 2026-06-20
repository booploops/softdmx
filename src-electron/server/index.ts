/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import fastify from "fastify";
import { Server } from "socket.io";
import { fastifyStatic } from "@fastify/static";
import { join } from "path";
import { getDevUrl, isDev } from "../utils";
import { AppState } from "../state/main";
import { OutputManager } from "../output/OutputManager";
import { ConfigFile } from "../config/configFile";
import { DmxUsbProDriver } from "../output/DmxUsbProDriver";
import { registerRemoteHandlers, attachChannelPipeline } from "./api/remote";
import { registerRemoteRestRoutes } from "./api/rest";
import type { ShowDocumentV1 } from "src/types/show-document";

function getIOCors() {
  return {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };
}

export const http_server = fastify();

export const io = new Server(http_server.server, {
  cors: getIOCors(),
});
AppState.io = io;

export const config = new ConfigFile();
export const outputManager = new OutputManager(config);

let currentShow: ShowDocumentV1 | null = null;

export function startServer() {
  const __dirname = new URL(".", import.meta.url).pathname;
  const assetsPath = join(__dirname, '../app.asar.unpacked');
  http_server.register(fastifyStatic, {
    root: assetsPath,
    prefix: "/app/",
  });

  http_server.get('/source', (req, reply) => {
    if(isDev()) {
      reply.redirect(getDevUrl() + '/#/artnet');
      return;
    }
    reply.redirect('/app/index.html#/artnet');
  })

  const remoteContext = {
    io,
    outputManager,
    getShow: () => currentShow,
    setShow: (show: ShowDocumentV1) => {
      currentShow = show;
    },
  };

  registerRemoteRestRoutes(http_server, remoteContext);
  attachChannelPipeline(io, outputManager);
  http_server.listen({ port: AppState.port, ipv6Only: false });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.emit("settings:current", config);
    if (currentShow) {
      socket.emit("show:state", currentShow);
    }

    socket.on("settings:get", () => {
      socket.emit("settings:current", config);
    });

    socket.on("settings:update", (newConfig: Partial<ConfigFile>) => {
      Object.assign(config, newConfig);
      if (currentShow && newConfig.OutputDestinations) {
        currentShow.destinations = newConfig.OutputDestinations;
      }
      outputManager.updateConfig(config);
      io.emit("settings:current", config);
    });

    socket.on("ports:list", async () => {
      const ports = await DmxUsbProDriver.listPorts();
      socket.emit("ports:available", ports);
    });

    registerRemoteHandlers(socket, remoteContext);
  });

  console.log("Server started on port 5353");
  console.log("WebSocket server started on port 5353");
}
