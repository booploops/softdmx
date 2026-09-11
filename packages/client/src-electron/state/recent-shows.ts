/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import fs from "fs";
import path from "path";
import { Paths } from "../runtime/paths";

const RECENT_LIMIT = 12;

export interface RecentShowEntry {
  path: string;
  name: string;
  modified: string;
}

function recentPath(): string {
  return path.join(Paths.appData, "recent-shows.json");
}

export function readRecentShows(): RecentShowEntry[] {
  try {
    if (!fs.existsSync(recentPath())) return [];
    const parsed = JSON.parse(fs.readFileSync(recentPath(), "utf-8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is RecentShowEntry =>
        !!entry &&
        typeof entry.path === "string" &&
        typeof entry.name === "string" &&
        typeof entry.modified === "string",
    );
  } catch {
    return [];
  }
}

export function rememberRecentShow(entry: RecentShowEntry): RecentShowEntry[] {
  const next = [entry, ...readRecentShows().filter((item) => item.path !== entry.path)].slice(
    0,
    RECENT_LIMIT,
  );
  try {
    if (!fs.existsSync(Paths.appData)) {
      fs.mkdirSync(Paths.appData, { recursive: true });
    }
    fs.writeFileSync(recentPath(), JSON.stringify(next, null, 2));
  } catch (error) {
    console.error("Failed to write recent shows:", error);
  }
  return next;
}
