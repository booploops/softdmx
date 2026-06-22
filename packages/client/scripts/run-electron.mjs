/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('Building Electron main and preload scripts...');
try {
  execSync('npx rolldown -c rolldown.config.js', { cwd: rootDir, stdio: 'inherit' });
} catch (err) {
  console.error('Failed to build Electron files:', err);
  process.exit(1);
}

const appUrl = process.env.APP_URL || 'http://127.0.0.1:9000';

async function waitForUrl(url, timeoutMs = 60000) {
  const parsedUrl = new URL(url);
  const startTime = Date.now();
  console.log(`Waiting for frontend dev server at ${url}...`);

  while (true) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for dev server at ${url}`);
    }

    try {
      await new Promise((resolve, reject) => {
        const req = http.request({
          method: 'GET',
          hostname: parsedUrl.hostname === 'localhost' ? '127.0.0.1' : parsedUrl.hostname,
          port: parsedUrl.port || 80,
          path: parsedUrl.pathname,
          timeout: 1000,
        }, (res) => {
          resolve();
        });
        
        req.on('error', reject);
        req.end();
      });
      console.log('Frontend dev server is ready!');
      break;
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

async function run() {
  try {
    await waitForUrl(appUrl);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  console.log('Launching Electron...');

  const env = {
    ...process.env,
    DEV: 'true',
    APP_URL: appUrl,
  };

  const args = ['electron', 'dist-electron/main.js', ...process.argv.slice(2)];
  const electronProcess = spawn('npx', args, {
    cwd: rootDir,
    env,
    stdio: 'inherit',
    shell: true,
  });

  electronProcess.on('close', (code) => {
    process.exit(code || 0);
  });
}

run();
