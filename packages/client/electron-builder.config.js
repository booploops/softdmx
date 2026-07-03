/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * @type {import('electron-builder').Configuration}
 */
export default {
  appId: "softdmx",
  productName: "SoftDMX",
  directories: {
    output: "dist/electron",
  },
  files: ["dist/spa/**/*", "dist-electron/**/*", "package.json"],
  asar: true,
  asarUnpack: ["**/*.node"],
  mac: {
    identity: null,
    icon: "src-electron/icons/icon.icns",
    target: ["dir"],
  },
  win: {
    icon: "src-electron/icons/icon.ico",
    target: ["dir"],
  },
};
