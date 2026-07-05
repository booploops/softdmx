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
  { name: "icon_16x16.png", size: 16, icns: true, ico: true },
  { name: "icon_16x16@2x.png", size: 32, icns: true, ico: false },
  { name: "icon_32x32.png", size: 32, icns: true, ico: true },
  { name: "icon_32x32@2x.png", size: 64, icns: true, ico: false },
  { name: "icon_48x48.png", size: 48, icns: false, ico: true },
  { name: "icon_128x128.png", size: 128, icns: true, ico: true },
  { name: "icon_128x128@2x.png", size: 256, icns: true, ico: false },
  { name: "icon_256x256.png", size: 256, icns: true, ico: true },
  { name: "icon_256x256@2x.png", size: 512, icns: true, ico: false },
  { name: "icon_512x512.png", size: 512, icns: true, ico: false },
  { name: "icon_512x512@2x.png", size: 1024, icns: true, ico: false },
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

// 6. Generate Windows .ico file
console.log("Generating Windows .ico file...");
try {
  const icoBuffers = [];
  for (const { name, size, ico } of sizes) {
    if (ico) {
      const filePath = path.resolve(iconsetPath, name);
      const buffer = fs.readFileSync(filePath);
      icoBuffers.push({ buffer, width: size, height: size });
    }
  }
  const icoBuffer = createIco(icoBuffers);
  fs.writeFileSync(path.resolve(destDir, "icon.ico"), icoBuffer);
} catch (error) {
  console.error("Failed to generate .ico file:", error);
  fs.rmSync(iconsetPath, { recursive: true, force: true });
  process.exit(1);
}

// 7. Remove non-icns files from iconset before running iconutil
for (const { name, icns } of sizes) {
  if (!icns) {
    const filePath = path.resolve(iconsetPath, name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// 8. Convert iconset to icns
console.log("Converting iconset to icns...");
try {
  execSync(`iconutil -c icns "${iconsetPath}"`, { stdio: "inherit" });
} catch (error) {
  console.error("Failed to generate icns file using iconutil:", error);
  fs.rmSync(iconsetPath, { recursive: true, force: true });
  process.exit(1);
}

// 9. Cleanup iconset folder
console.log("Cleaning up temporary files...");
fs.rmSync(iconsetPath, { recursive: true, force: true });

console.log("Successfully generated icns, ico, and copied png!");

/**
 * Creates a Windows ICO file buffer from an array of PNG buffers.
 * @param {Array<{buffer: Buffer, width: number, height: number}>} pngBuffers
 * @returns {Buffer}
 */
function createIco(pngBuffers) {
  const headerSize = 6;
  const directorySize = 16 * pngBuffers.length;
  
  const buffer = Buffer.alloc(headerSize + directorySize + pngBuffers.reduce((sum, item) => sum + item.buffer.length, 0));
  
  // Header
  buffer.writeUInt16LE(0, 0); // Reserved
  buffer.writeUInt16LE(1, 2); // Image type (1 = icon)
  buffer.writeUInt16LE(pngBuffers.length, 4); // Number of images
  
  let offset = headerSize + directorySize;
  
  for (let i = 0; i < pngBuffers.length; i++) {
    const { buffer: pngBuffer, width, height } = pngBuffers[i];
    const dirOffset = headerSize + i * 16;
    
    buffer.writeUInt8(width >= 256 ? 0 : width, dirOffset);
    buffer.writeUInt8(height >= 256 ? 0 : height, dirOffset + 1);
    buffer.writeUInt8(0, dirOffset + 2); // Color palette size
    buffer.writeUInt8(0, dirOffset + 3); // Reserved
    buffer.writeUInt16LE(1, dirOffset + 4); // Color planes
    buffer.writeUInt16LE(32, dirOffset + 6); // Bits per pixel
    buffer.writeUInt32LE(pngBuffer.length, dirOffset + 8); // Image size
    buffer.writeUInt32LE(offset, dirOffset + 12); // Image offset
    
    pngBuffer.copy(buffer, offset);
    offset += pngBuffer.length;
  }
  
  return buffer;
}
