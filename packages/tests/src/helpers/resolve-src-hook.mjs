/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve as pathResolve, dirname, basename } from 'node:path';

const root = pathResolve(fileURLToPath(import.meta.url), '../../../../frontend'); // packages/frontend
const monorepoRoot = pathResolve(root, '..'); // packages/

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

function isModuleNotFound(error) {
  return error instanceof Error && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
}

function hasExplicitExtension(specifier) {
  return /\.(?:ts|js|mjs|cjs|json|node)$/i.test(specifier);
}

function mapPath(absolutePath) {
  const normalized = absolutePath.replace(/\\/g, '/');
  const frontendSrc = pathResolve(root, 'src').replace(/\\/g, '/');
  
  if (normalized.startsWith(frontendSrc)) {
    const relativePart = normalized.slice(frontendSrc.length + 1); // e.g. "engine/align-wings.ts"
    
    if (relativePart.startsWith('engine/')) {
      const corePart = relativePart.slice('engine/'.length);
      return pathResolve(monorepoRoot, 'engine/src/core', corePart);
    }
    if (relativePart.startsWith('types/')) {
      const typesPart = relativePart.slice('types/'.length);
      return pathResolve(monorepoRoot, 'engine/src/types', typesPart);
    }
    if (relativePart.startsWith('show/')) {
      const showPart = relativePart.slice('show/'.length);
      return pathResolve(monorepoRoot, 'engine/src/show', showPart);
    }
    if (relativePart.startsWith('fixture-library/')) {
      if (!relativePart.includes('loader') && !relativePart.includes('registry') && !relativePart.includes('builtin/')) {
        const fixturePart = relativePart.slice('fixture-library/'.length);
        return pathResolve(monorepoRoot, 'engine/src/fixture-library', fixturePart);
      }
    }
    if (relativePart.startsWith('utils/')) {
      const fileBase = basename(relativePart, '.ts').replace(/\.js$/, '').replace(/\.ts$/, '');
      if (MOVED_UTILS.has(fileBase)) {
        const utilsPart = relativePart.slice('utils/'.length);
        return pathResolve(monorepoRoot, 'engine/src/utils', utilsPart);
      }
    }
  }
  return absolutePath;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@softdmx/engine') {
    const mapped = pathToFileURL(pathResolve(monorepoRoot, 'engine/src/index.ts')).href;
    return nextResolve(mapped, context);
  }
  if (specifier.startsWith('@softdmx/engine/')) {
    const subPart = specifier.slice('@softdmx/engine/'.length);
    const mapped = pathToFileURL(pathResolve(monorepoRoot, 'engine/src', subPart)).href;
    return nextResolve(mapped, context);
  }

  let absolutePath;
  if (specifier.startsWith('src/')) {
    absolutePath = pathResolve(root, specifier);
  } else if (specifier.startsWith('.') || specifier.startsWith('/')) {
    const parentDir = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : root;
    absolutePath = pathResolve(parentDir, specifier);
  }

  if (absolutePath) {
    const mapped = mapPath(absolutePath);
    if (mapped !== absolutePath) {
      let candidate = mapped;
      if (!hasExplicitExtension(candidate)) {
        candidate = `${candidate}.ts`;
      }
      const mappedUrl = pathToFileURL(candidate).href;
      return nextResolve(mappedUrl, context);
    }
  }

  if (specifier.startsWith('src/')) {
    const candidate = pathResolve(root, `${specifier}.ts`);
    const mapped = pathToFileURL(mapPath(candidate)).href;
    return nextResolve(mapped, context);
  }

  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      isModuleNotFound(error)
      && !hasExplicitExtension(specifier)
      && !specifier.startsWith('node:')
    ) {
      let resolvedPath;
      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        const parentDir = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : root;
        resolvedPath = pathResolve(parentDir, `${specifier}.ts`);
      } else {
        resolvedPath = pathResolve(root, `${specifier}.ts`);
      }
      const mapped = mapPath(resolvedPath);
      const mappedUrl = pathToFileURL(mapped).href;
      return nextResolve(mappedUrl, context);
    }
    throw error;
  }
}
