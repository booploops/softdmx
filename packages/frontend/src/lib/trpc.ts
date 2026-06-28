/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createTRPCProxyClient } from "@trpc/client";
import { ipcLink } from "electron-trpc-experimental/renderer";
import type { AppRouter } from "src-electron/ipc/trpc-router";

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [ipcLink()],
});
