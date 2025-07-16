/*
 * Copyright (C) 2025-Present booploops and contributors
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import fastify from "fastify";
import { Server } from "socket.io";

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
  http_server.listen({ port: 5353, ipv6Only: false });

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
