import { load, dump } from "js-toml";
import { signal, effect } from "alien-signals";
import {
  createDefaultConfigFile,
  mergeConfigPatch,
  parseConfigFile,
  type ConfigFileData,
  type ConfigPatch,
} from "@softdmx/shared";
import { Paths } from "../../runtime/paths";
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
        configFile(parseConfigFile(parsed));
      } else {
        if (!fs.existsSync(Paths.appData)) {
          fs.mkdirSync(Paths.appData, { recursive: true });
        }
        fs.writeFileSync(configPath, dump(JSON.parse(JSON.stringify(configFile()))));
      }
    } catch (e) {
      console.error("Failed to load or create config.toml:", e);
    }

    isLoaded = true;

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
    const next = mergeConfigPatch(configFile(), patch);
    configFile(next);
    return next;
  }

  return { configFile, load: loadConfig, update };
}

export const config = createConfigStore();
