#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const headerPath = join(root, 'node_modules/abletonlink/src/napi-abletonlink.hpp');
const marker = 'callback_thread().detach();';

if (!existsSync(headerPath)) {
  process.exit(0);
}

const source = readFileSync(headerPath, 'utf8');
if (!source.includes(marker)) {
  const patched = source.replace(
    'callback_thread() = std::thread(callback_handler);\n                b = false;',
    'callback_thread() = std::thread(callback_handler);\n                callback_thread().detach();\n                b = false;'
  );

  if (patched === source) {
    console.warn('patch-abletonlink: expected source pattern not found');
    process.exit(0);
  }

  writeFileSync(headerPath, patched);
  console.log('patch-abletonlink: applied detach fix');
}

console.log('patch-abletonlink: source patch applied (rebuild handled by rebuild-native.mjs)');
