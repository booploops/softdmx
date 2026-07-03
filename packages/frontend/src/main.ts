/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApp } from "vue";
import { createPinia } from "pinia";
import { Quasar, Dialog, Notify, Dark, Screen, Platform } from "quasar";
import App from "./App.vue";
import createRouter from "./router";
import { createVfm } from "vue-final-modal";

import "@quasar/extras/material-icons/material-icons.css";
import "@quasar/extras/ionicons-v4/ionicons-v4.css";
import "@quasar/extras/mdi-v7/mdi-v7.css";
import "@quasar/extras/fontawesome-v7/fontawesome-v7.css";
import "quasar/src/css/index.sass";
import "@vscode/codicons/dist/codicon.css";
import "vue-final-modal/style.css";
import "ninja-keys";
import "@fontsource-variable/noto-sans";

// Custom Styles
import "./css/app.scss";
import "./css/desk.scss";

// Create App
const app = createApp(App);

// Create Pinia and Router
const pinia = createPinia();
const router = createRouter();
const vfm = createVfm();

app.use(pinia);
app.use(router);
app.use(vfm);

// Configure Quasar
app.use(Quasar, {
  plugins: {
    Dialog,
    Notify,
    Dark,
    Screen,
    Platform,
  },
  config: {
    ripple: {
      early: true,
    },
  },
});

// Boot files loading function
async function runBootFiles() {
  const context = {
    app,
    router,
    store: pinia,
  };

  // We load the boot files in the same order as previously configured in quasar.config.ts
  const bootFiles = [
    () => import("./boot/viewport-height"),
    () => import("./boot/i18n"),
    () => import("./boot/info-directive"),
    () => import("./boot/config"),
    () => import("./boot/theme"),
    () => import("./boot/quasar-overrides"),
    () => import("./boot/show"),
    () => import("./boot/device-io-init"),
    () => import("./boot/remote-api"),
    () => import("./boot/audio"),
    () => import("./boot/timecode"),
  ];

  for (const bootFile of bootFiles) {
    try {
      const module = await bootFile();
      if (typeof module.default === "function") {
        await module.default(context);
      }
    } catch (error) {
      console.error("Error running boot file:", error);
    }
  }

  // Mount the app
  app.mount("#q-app");
}

void runBootFiles();
