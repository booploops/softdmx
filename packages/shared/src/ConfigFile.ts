export class ConfigFile {
  version: number = 1;

  /**
   * Takes a JSON object and mergest it with the current config.
   * The incoming JSON object is assumed to be from an older or newer
   * version of the config file.
   */
  static fromJSON(jsonObject: Record<string, unknown>): ConfigFile {
    const config = new ConfigFile();
    Object.assign(config, jsonObject);
    return config;
  }
}
