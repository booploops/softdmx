/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

// const targets = [
//   "node22-macos-arm64",
//   "node22-windows-x64",
//   "node22-windows-arm64",
//   "node22-linux-arm64",
//   "node22-linux-x64",
// ];

export default {
  scripts: "build/**/*.js",
  //   targets,
  outputPath: "dist",
  options: ["enable-source-maps", "tls-min-v1.0"],
};
