/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { defineConfig } from 'vitest/config';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../frontend');
const monorepoRoot = resolve(__dirname, '..');

const MOVED_UTILS = new Set([
  'desk-defaults',
  'group-colors',
  'link-lfo',
  'midi-parser',
  'osc-parser',
  'output-health',
  'pan-tilt-aim',
  'preset-pool',
  'session-epoch',
  'sync-compensation',
  'timecode-format',
  'video-defaults'
]);

function mapPath(absolutePath: string) {
  const normalized = absolutePath.replace(/\\/g, '/');
  const frontendSrc = resolve(root, 'src').replace(/\\/g, '/');
  
  if (normalized.startsWith(frontendSrc)) {
    const relativePart = normalized.slice(frontendSrc.length + 1);
    
    if (relativePart.startsWith('engine/')) {
      const corePart = relativePart.slice('engine/'.length);
      return resolve(monorepoRoot, 'engine/src/core', corePart);
    }
    if (relativePart.startsWith('types/')) {
      const typesPart = relativePart.slice('types/'.length);
      return resolve(monorepoRoot, 'engine/src/types', typesPart);
    }
    if (relativePart.startsWith('show/')) {
      const showPart = relativePart.slice('show/'.length);
      return resolve(monorepoRoot, 'engine/src/show', showPart);
    }
    if (relativePart.startsWith('fixture-library/')) {
      if (!relativePart.includes('loader') && !relativePart.includes('registry') && !relativePart.includes('builtin/')) {
        const fixturePart = relativePart.slice('fixture-library/'.length);
        return resolve(monorepoRoot, 'engine/src/fixture-library', fixturePart);
      }
    }
    if (relativePart.startsWith('utils/')) {
      const fileBase = basename(relativePart, '.ts').replace(/\.js$/, '').replace(/\.ts$/, '');
      if (MOVED_UTILS.has(fileBase)) {
        const utilsPart = relativePart.slice('utils/'.length);
        return resolve(monorepoRoot, 'engine/src/utils', utilsPart);
      }
    }
  }
  return absolutePath;
}

export default defineConfig({
  resolve: {
    alias: {
      'node:test': resolve(__dirname, './src/helpers/node-test-bridge.ts'),
    },
  },
  plugins: [
    {
      name: 'resolve-frontend-to-engine',
      resolveId(source, importer) {
        if (source === '@softdmx/engine') {
          return resolve(monorepoRoot, 'engine/src/index.ts');
        }
        if (source.startsWith('@softdmx/engine/')) {
          const subPart = source.slice('@softdmx/engine/'.length);
          return resolve(monorepoRoot, 'engine/src', subPart);
        }

        let absolutePath: string | null = null;
        if (source.startsWith('src/')) {
          absolutePath = resolve(root, source);
        } else if (source.startsWith('.') || source.startsWith('/')) {
          const parentDir = importer ? dirname(importer) : root;
          absolutePath = resolve(parentDir, source);
        }

        if (absolutePath) {
          const mapped = mapPath(absolutePath);
          if (mapped !== absolutePath) {
            if (!/\.(?:ts|js|mjs|cjs|json|node)$/i.test(mapped)) {
              return `${mapped}.ts`;
            }
            return mapped;
          }
        }
        return null;
      }
    }
  ],
  test: {
    include: ['src/**/*.test.ts', 'src/e2e/**/*.mjs', 'src/e2e-smoke.mjs'],
    passWithNoTests: true,
  }
});
