/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { pathToFileURL } from 'node:url';
import { resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = pathResolve(fileURLToPath(import.meta.url), '../../..');

function isModuleNotFound(error) {
  return error instanceof Error && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
}

function hasExplicitExtension(specifier) {
  return /\.(?:ts|js|mjs|cjs|json|node)$/i.test(specifier);
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('src/')) {
    const mapped = pathToFileURL(pathResolve(root, `${specifier}.ts`)).href;
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
      return nextResolve(`${specifier}.ts`, context);
    }
    throw error;
  }
}
