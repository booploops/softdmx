/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { load, dump } from "js-toml";
import { randomBytes } from "node:crypto";
import { signal, effect } from "alien-signals";
import {
  createDefaultConfigFile,
  mergeConfigPatch,
  parseConfigFile,
  type ConfigFileData,
  type ConfigPatch,
} from "@softdmx/shared";
import { Paths } from "../../runtime/paths";
import { setConfiguredRemoteApiToken } from "../../server/auth/remote-token";
import fs from "fs";
import path from "path";

export function createConfigStore() {
  const configFile = signal<ConfigFileData>(createDefaultConfigFile());
  const configPath = path.join(Paths.appData, "config.toml");
  let isLoaded = false;

  function loadConfig() {
    if (isLoaded) return;

    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf-8");
        const parsed = load(content);
        configFile(ensureRemoteToken(parseConfigFile(parsed)));
      } else {
        configFile(ensureRemoteToken(configFile()));
        if (!fs.existsSync(Paths.appData)) {
          fs.mkdirSync(Paths.appData, { recursive: true });
        }
        fs.writeFileSync(configPath, dump(JSON.parse(JSON.stringify(configFile()))));
      }
    } catch (e) {
      console.error("Failed to load or create config.toml:", e);
    }

    isLoaded = true;
    applyRemoteToken(configFile());

    effect(() => {
      try {
        if (!fs.existsSync(Paths.appData)) {
          fs.mkdirSync(Paths.appData, { recursive: true });
        }
        const data = configFile();
        fs.writeFileSync(configPath, dump(JSON.parse(JSON.stringify(data))));
      } catch (e) {
        console.error("Failed to save config.toml:", e);
      }
    });
  }

  function update(patch: ConfigPatch) {
    const next = ensureRemoteToken(mergeConfigPatch(configFile(), patch));
    configFile(next);
    applyRemoteToken(next);
    return next;
  }

  return { configFile, load: loadConfig, update };
}

function ensureRemoteToken(data: ConfigFileData): ConfigFileData {
  if (data.remote.apiToken.trim().length > 0) {
    return data;
  }
  return {
    ...data,
    remote: {
      ...data.remote,
      apiToken: randomBytes(24).toString("hex"),
    },
  };
}

function applyRemoteToken(data: ConfigFileData): void {
  setConfiguredRemoteApiToken(data.remote.apiToken);
}

export const config = createConfigStore();
