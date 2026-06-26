/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Server } from "socket.io";
import type { OutputManager } from "../../output/output-manager";

export function attachChannelPipeline(io: Server, outputManager: OutputManager): void {
  io.on("connection", (socket) => {
    socket.on("channels:state", (channels) => {
      io.emit("channels:state", channels);
      outputManager.handleChannelUpdate(channels);
    });

    // Legacy alias
    socket.on("channels:update", (channels) => {
      io.emit("channels:state", channels);
      outputManager.handleChannelUpdate(channels);
    });

    socket.on("show:state", (showfile) => {
      if (showfile) {
        outputManager.setShowfile(showfile);
        // Broadcast to other clients only — avoid echoing back to the sender
        socket.broadcast.emit("show:state", showfile);
      }
    });

    // Legacy alias
    socket.on("showfile:update", (showfile) => {
      if (showfile) {
        outputManager.setShowfile(showfile);
      }
    });
  });
}
