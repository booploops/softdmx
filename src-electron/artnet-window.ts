import { BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";


const currentDir = fileURLToPath(new URL('.', import.meta.url));

export async function createArtnetWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: 1920,
    height: 208,
    useContentSize: true,
    titleBarOverlay: false,
    titleBarStyle: "hidden",
    frame: false,
    resizable: false,
    roundedCorners: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    transparent: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(
        currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          "electron-preload" + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION
        )
      ),
    },
  });

  if (process.env.DEV) {
    await win.loadURL(process.env.APP_URL + "/#/artnet");
  } else {
    await win.loadFile("index.html", {
      hash: "#/artnet",
    });
  }

  return win;
}
