/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { build } from "rolldown";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Rolldown builds src/main.ts to build/bundle.js
 */
async function runBuild() {
  const inputPath = path.resolve(__dirname, "../src/main.ts");
  const outputPath = path.resolve(__dirname, "../build/index.js");

  console.log(`[Build] Bundling ${inputPath} to ${outputPath}...`);

  try {
    await build({
      input: inputPath,
      output: {
        file: outputPath,
        format: "esm",
        sourcemap: true,
      },
      platform: "node",
    });
    console.log("[Build] Rolldown build completed successfully.");
  } catch (error) {
    console.error("[Build] Rolldown build failed:", error);
    process.exit(1);
  }
}

runBuild();
