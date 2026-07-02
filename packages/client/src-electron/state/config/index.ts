import { load, dump } from "js-toml";
import { signal, effect } from "alien-signals";
import { ConfigFile } from "@softdmx/shared";
import { Paths } from "../../runtime/paths";
import fs from "fs";
import path from "path";

export function createConfigStore() {
  const configFile = signal<ConfigFile>(new ConfigFile());
  const configPath = path.join(Paths.appData, "config.toml");
  let isLoaded = false;

  function loadConfig() {
    if (isLoaded) return;
    
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf-8");
        const parsed = load(content);
        configFile(ConfigFile.fromJSON(parsed));
      }
    } catch (e) {
      console.error("Failed to load config.toml:", e);
    }
    
    isLoaded = true;

    effect(() => {
      try {
        if (!fs.existsSync(Paths.appData)) {
          fs.mkdirSync(Paths.appData, { recursive: true });
        }
        const data = configFile();
        fs.writeFileSync(configPath, dump(data as unknown as Record<string, unknown>));
      } catch (e) {
        console.error("Failed to save config.toml:", e);
      }
    });
  }

  return { configFile, load: loadConfig };
}

export const config = createConfigStore();
