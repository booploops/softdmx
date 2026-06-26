/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { Socket } from "socket.io";
import { DmxUsbProDriver } from "../../output/drivers/dmx-usb-pro-driver";
import type { RemoteContext } from "../context";
import { config, getCurrentShow, io, outputManager } from "../context";
import type { ConfigFile } from "../app-settings";

export function registerSettingsHandlers(socket: Socket, _ctx: RemoteContext): void {
  socket.emit("settings:current", config);
  const currentShow = getCurrentShow();
  if (currentShow) {
    socket.emit("show:state", currentShow);
  }

  socket.on("settings:get", () => {
    socket.emit("settings:current", config);
  });

  socket.on("settings:update", (newConfig: Partial<ConfigFile>) => {
    Object.assign(config, newConfig);
    const show = getCurrentShow();
    if (show && newConfig.OutputDestinations) {
      show.destinations = newConfig.OutputDestinations;
    }
    outputManager.updateConfig(config);
    io.emit("settings:current", config);
  });

  socket.on("ports:list", async () => {
    const ports = await DmxUsbProDriver.listPorts();
    socket.emit("ports:available", ports);
  });
}
