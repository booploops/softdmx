/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import vueI18n from "@intlify/unplugin-vue-i18n/vite";
import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import VueDevTools from "vite-plugin-vue-devtools";

export default defineConfig({
  plugins: [
    VueDevTools(),
    vue({
      template: {
        transformAssetUrls,
      },
    }),
    quasar({
      sassVariables: "src/css/quasar.variables.scss",
    }),
    AutoImport({
      include: [
        /\.vue$/,
        /\.vue\?vue/,
      ],
      imports: [
        "vue",
        "pinia",
      ],
    }),
    vueI18n({
      ssr: false,
      include: [fileURLToPath(new URL("./src/i18n", import.meta.url))],
    }),
  ],
  resolve: {
    alias: {
      "src": fileURLToPath(new URL("./src", import.meta.url)),
      "layouts": fileURLToPath(new URL("./src/layouts", import.meta.url)),
      "pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
      "components": fileURLToPath(new URL("./src/components", import.meta.url)),
      "assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
      "boot": fileURLToPath(new URL("./src/boot", import.meta.url)),
    },
  },
  define: {
    "process.env.SERVER": "false",
    "process.env.VUE_ROUTER_MODE": '"hash"',
    "process.env.VUE_ROUTER_BASE": '""',
  },
  server: {
    port: 9000,
    host: "127.0.0.1",
  },
  build: {
    outDir: "../client/dist/spa",
    emptyOutDir: true,
    target: "es2022",
  },
});
