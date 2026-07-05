/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const sourcePngPath = path.resolve(rootDir, "assets/icon.png");
const destDir = path.resolve(rootDir, "packages/client/src-electron/icons");
const destPngPath = path.resolve(destDir, "icon.png");
const iconsetPath = path.resolve(destDir, "icon.iconset");

// 1. Ensure we are running on macOS since sips and iconutil are macOS-specific
if (process.platform !== "darwin") {
  console.error("Error: This script must be run on macOS (Darwin) because it relies on sips and iconutil.");
  process.exit(1);
}

// 2. Ensure source png exists
if (!fs.existsSync(sourcePngPath)) {
  console.error(`Error: Source icon not found at ${sourcePngPath}`);
  process.exit(1);
}

// 3. Ensure target directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// 4. Copy png to the electron icons folder
console.log(`Copying source PNG to: ${destPngPath}`);
fs.copyFileSync(sourcePngPath, destPngPath);

// 5. Create temporary iconset folder
if (fs.existsSync(iconsetPath)) {
  fs.rmSync(iconsetPath, { recursive: true, force: true });
}
fs.mkdirSync(iconsetPath);

const sizes = [
  { name: "icon_16x16.png", size: 16 },
  { name: "icon_16x16@2x.png", size: 32 },
  { name: "icon_32x32.png", size: 32 },
  { name: "icon_32x32@2x.png", size: 64 },
  { name: "icon_128x128.png", size: 128 },
  { name: "icon_128x128@2x.png", size: 256 },
  { name: "icon_256x256.png", size: 256 },
  { name: "icon_256x256@2x.png", size: 512 },
  { name: "icon_512x512.png", size: 512 },
  { name: "icon_512x512@2x.png", size: 1024 },
];

console.log("Generating resized icons inside iconset...");
for (const { name, size } of sizes) {
  const outputPath = path.resolve(iconsetPath, name);
  try {
    execSync(`sips -z ${size} ${size} "${sourcePngPath}" --out "${outputPath}"`, {
      stdio: "ignore",
    });
  } catch (error) {
    console.error(`Failed to resize icon for ${name}:`, error);
    // Cleanup and exit
    fs.rmSync(iconsetPath, { recursive: true, force: true });
    process.exit(1);
  }
}

// 6. Convert iconset to icns
console.log("Converting iconset to icns...");
try {
  execSync(`iconutil -c icns "${iconsetPath}"`, { stdio: "inherit" });
} catch (error) {
  console.error("Failed to generate icns file using iconutil:", error);
  fs.rmSync(iconsetPath, { recursive: true, force: true });
  process.exit(1);
}

// 7. Cleanup iconset folder
console.log("Cleaning up temporary files...");
fs.rmSync(iconsetPath, { recursive: true, force: true });

console.log("Successfully generated icns and copied png!");
