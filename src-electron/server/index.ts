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

export function startServer() {
  const __dirname = new URL(".", import.meta.url).pathname;
  const assetsPath = join(__dirname, '../app.asar.unpacked');
  http_server.register(fastifyStatic, {
    root: assetsPath,
    prefix: "/app/",
  });

  http_server.get('/foo', (req, reply) => {
    return 'bar'
  })

  http_server.get('/source', (req, reply) => {
    if(isDev()) {
      reply.redirect(getDevUrl() + '/#/artnet');
      return;
    }
    reply.redirect('/app/index.html#/artnet');
  })

  http_server.listen({ port: AppState.port, ipv6Only: false });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
  });

  io.use((socket, next) => {
    // echo back any message received
    socket.on("message", (message) => {
      console.log("Message received:", message);
      socket.emit("message", message);
    });

    socket.on("channels:update", (message) => {
      io.emit("channels:update", message);
    });
    next();
  });
  console.log("Server started on port 5353");
  console.log("WebSocket server started on port 5353");
}
