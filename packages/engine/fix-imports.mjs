/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "src");

function fixImports(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      fixImports(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith(".ts") || fullPath.endsWith(".vue"))) {
      let content = fs.readFileSync(fullPath, "utf-8");

      const relativeDepth = path.relative(dir, srcDir);
      const prefix = relativeDepth === "" ? "./" : relativeDepth + "/";

      const newContent = content
        .replace(/from 'src\//g, `from '${prefix}`)
        .replace(/from "src\//g, `from "${prefix}`);

      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

fixImports(srcDir);
