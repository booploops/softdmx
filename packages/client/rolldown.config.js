/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineConfig } from "rolldown";
import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const external = [
  "electron",
  "serialport",
  "abletonlink",
  "@napolab/texture-bridge",
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

export default defineConfig([
  {
    input: "src-electron/electron-main.ts",
    output: {
      file: "dist-electron/main.js",
      format: "esm",
    },
    external,
    platform: "node",
    resolve: {
      alias: {
        src: path.resolve(__dirname, "../frontend/src"),
      },
    },
  },
  {
    input: "src-electron/output/output-worker.ts",
    output: {
      file: "dist-electron/output-worker.js",
      format: "esm",
    },
    external,
    platform: "node",
    resolve: {
      alias: {
        src: path.resolve(__dirname, "../frontend/src"),
      },
    },
  },
  {
    input: "src-electron/electron-preload.ts",
    output: {
      file: "dist-electron/preload.js",
      format: "cjs",
    },
    external,
    platform: "node",
    resolve: {
      alias: {
        src: path.resolve(__dirname, "../frontend/src"),
      },
    },
  },
]);
