/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".yarn",
  ".cursor",
  "dist",
  "dist-electron",
  ".agents",
  "temp",
  ".output",
  ".quasar",
]);

const EXCLUDED_FILES = new Set([
  path.join("packages", "frontend", "auto-imports.d.ts"),
  path.join("packages", "frontend", "src", "types", "components.d.ts"),
]);

const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".vue",
  ".zig",
  ".css",
  ".scss",
  ".html",
]);

const missingFiles = [];

function isIgnored(filePath, isDir) {
  try {
    const checkPath = isDir ? `${filePath}/` : filePath;
    execSync(`git check-ignore -q "${checkPath}"`, {
      stdio: "ignore",
      cwd: repoRoot,
    });
    return true; // 0 exit code = ignored
  } catch (e) {
    return false; // non-zero exit code = not ignored
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(repoRoot, fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name) || isIgnored(fullPath, true)) {
        continue;
      }
      scanDir(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ALLOWED_EXTENSIONS.has(ext)) {
        if (EXCLUDED_FILES.has(relPath) || isIgnored(fullPath, false)) {
          continue;
        }

        const content = fs.readFileSync(fullPath, "utf8");
        // Check for presence of license identifier
        if (!content.includes("mozilla.org/MPL/2.0")) {
          missingFiles.push(relPath);
        }
      }
    }
  }
}

console.log("Scanning workspace for files missing the MPL header...");
scanDir(repoRoot);

if (missingFiles.length > 0) {
  console.log(
    `\nFound ${missingFiles.length} file(s) missing the MPL header:\n`,
  );
  for (const file of missingFiles) {
    console.log(`  - ${file}`);
  }
  console.log("\nTo automatically add the missing headers, run:");
  console.log("  node scripts/add-missing-headers.js\n");
  process.exit(1);
} else {
  console.log("\nAll checked files contain the MPL license header.\n");
  process.exit(0);
}
