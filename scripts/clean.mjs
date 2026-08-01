/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const BUILD_PATHS = [
  "packages/client/dist-electron",
  "packages/client/dist",
  "packages/frontend/dist",
  "packages/wasm/dist",
  "packages/server/build",
  "dist",
  "packages/tests/coverage",
  "test-results",
  "playwright-report",
  "blob-report",
  "playwright/.cache",
];

const DEV_PATHS = [
  "packages/frontend/node_modules/.vite",
  "packages/frontend/.quasar",
  "packages/frontend/.histoire",
];

function getAppDataDir() {
  const appName = "dev.booploops.softdmx";
  switch (process.platform) {
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support", appName);
    case "win32":
      return path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), appName);
    default:
      return path.join(os.homedir(), ".config", appName);
  }
}

function formatPath(target) {
  return target.startsWith(`${repoRoot}${path.sep}`) ? path.relative(repoRoot, target) : target;
}

function removeTarget(target) {
  if (!fs.existsSync(target)) {
    return false;
  }

  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed ${formatPath(target)}`);
  return true;
}

function printHelp() {
  console.log(`Usage: yarn clean [options]

By default, removes build outputs, dev caches, and Electron app data.

Options:
  --build     Remove build and test output directories only
  --dev       Remove dev-server caches only (Vite, Quasar)
  --appdata   Remove saved Electron settings and workspace layout only

Pass one or more flags to clean specific targets. With no flags, all targets are cleaned.`);
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const cleanBuild = args.includes("--build");
const cleanDev = args.includes("--dev");
const cleanAppData = args.includes("--appdata");
const cleanAll = !cleanBuild && !cleanDev && !cleanAppData;

const targets = [];

if (cleanAll || cleanBuild) {
  targets.push(...BUILD_PATHS.map((relativePath) => path.join(repoRoot, relativePath)));
}

if (cleanAll || cleanDev) {
  targets.push(...DEV_PATHS.map((relativePath) => path.join(repoRoot, relativePath)));
}

if (cleanAll || cleanAppData) {
  targets.push(getAppDataDir());
}

const labels = [];
if (cleanAll || cleanBuild) labels.push("build");
if (cleanAll || cleanDev) labels.push("dev");
if (cleanAll || cleanAppData) labels.push("appdata");

console.log(`Cleaning ${labels.join(", ")}...`);

let removedCount = 0;
for (const target of targets) {
  if (removeTarget(target)) {
    removedCount += 1;
  }
}

if (removedCount === 0) {
  console.log("Nothing to clean.");
} else {
  console.log(`Clean complete (${removedCount} path${removedCount === 1 ? "" : "s"} removed).`);
}
