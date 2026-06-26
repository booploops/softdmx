/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { BrowserWindow } from "electron";

export function isOutputNodeMode(argv = process.argv): boolean {
  return argv.includes("--output-node");
}

export function resolveOutputNodeShowPath(argv = process.argv): string | null {
  const showFlagIndex = argv.indexOf("--show");
  if (showFlagIndex >= 0 && argv[showFlagIndex + 1]) {
    return argv[showFlagIndex + 1] ?? null;
  }
  return null;
}

export function buildOutputNodeUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.hash = "#/output-node";
  url.searchParams.set("outputNode", "1");
  return url.toString();
}

export function configureOutputNodeWindow(window: BrowserWindow) {
  window.setMenuBarVisibility(false);
}
