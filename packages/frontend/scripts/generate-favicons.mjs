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
const destDir = path.resolve(rootDir, "packages/frontend/public");

// 1. Ensure we are running on macOS since sips is macOS-specific
if (process.platform !== "darwin") {
  console.error("Error: This script must be run on macOS (Darwin) because it relies on sips.");
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

// Targets to generate directly
const targets = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
];

console.log("Generating resized PNG favicons...");
for (const { name, size } of targets) {
  const outputPath = path.resolve(destDir, name);
  try {
    execSync(`sips -z ${size} ${size} "${sourcePngPath}" --out "${outputPath}"`, {
      stdio: "ignore",
    });
  } catch (error) {
    console.error(`Failed to resize favicon for ${name}:`, error);
    process.exit(1);
  }
}

// Generate icon.avif
console.log("Generating icon.avif...");
const avifOutputPath = path.resolve(destDir, "icon.avif");
try {
  execSync(`sips -s format avif "${sourcePngPath}" --out "${avifOutputPath}"`, {
    stdio: "ignore",
  });
} catch (error) {
  console.error("Failed to generate icon.avif:", error);
  process.exit(1);
}

// Generate logo.avif and Logo1.avif from Logo1.png
const sourceLogoPath = path.resolve(rootDir, "assets/Logo1.png");
const logoOutputPath = path.resolve(destDir, "logo.avif");
const logo1OutputPath = path.resolve(destDir, "Logo1.avif");
if (fs.existsSync(sourceLogoPath)) {
  console.log("Generating logo AVIF images...");
  try {
    execSync(`sips -s format avif "${sourceLogoPath}" --out "${logoOutputPath}"`, {
      stdio: "ignore",
    });
    execSync(`sips -s format avif "${sourceLogoPath}" --out "${logo1OutputPath}"`, {
      stdio: "ignore",
    });
  } catch (error) {
    console.error("Failed to generate logo AVIF files:", error);
    process.exit(1);
  }
}

// Generate favicon.ico using 16x16, 32x32, and 48x48
console.log("Generating favicon.ico...");
const icoSizes = [16, 32, 48];
const tempFiles = [];

try {
  const icoBuffers = [];
  for (const size of icoSizes) {
    const tempPath = path.resolve(destDir, `temp_ico_${size}.png`);
    execSync(`sips -z ${size} ${size} "${sourcePngPath}" --out "${tempPath}"`, {
      stdio: "ignore",
    });
    tempFiles.push(tempPath);
    const buffer = fs.readFileSync(tempPath);
    icoBuffers.push({ buffer, width: size, height: size });
  }

  const icoBuffer = createIco(icoBuffers);
  fs.writeFileSync(path.resolve(destDir, "favicon.ico"), icoBuffer);
} catch (error) {
  console.error("Failed to generate favicon.ico:", error);
  // Cleanup temp files
  for (const file of tempFiles) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  process.exit(1);
}

// Cleanup temp files
for (const file of tempFiles) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

console.log("Successfully generated all favicons!");

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
