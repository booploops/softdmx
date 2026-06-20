/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { BrowserWindow } from "electron";
import { Server } from "socket.io";

export const AppState = {
  port: 5353,
  artnetWindow: null as BrowserWindow | null,
  io: null as Server | null,
};

