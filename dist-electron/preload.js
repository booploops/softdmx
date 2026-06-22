import { contextBridge, ipcRenderer } from "electron";
//#region src-electron/electron-preload.ts
contextBridge.exposeInMainWorld("electronVideo", {
	listSenders: () => ipcRenderer.invoke("video-list-senders"),
	connect: (config) => ipcRenderer.invoke("video-connect", config),
	disconnect: () => ipcRenderer.invoke("video-disconnect"),
	getStatus: () => ipcRenderer.invoke("video-status"),
	onFrame: (callback) => {
		ipcRenderer.on("video-frame", (_event, payload) => callback(payload));
	},
	removeFrameListener: () => {
		ipcRenderer.removeAllListeners("video-frame");
	}
});
contextBridge.exposeInMainWorld("electronAPI", {
	onOscMessage: (callback) => {
		ipcRenderer.on("osc-received", callback);
	},
	removeOscListener: () => {
		ipcRenderer.removeAllListeners("osc-received");
	}
});
contextBridge.exposeInMainWorld("electronGridNode", {
	setVisible: (visible) => {
		ipcRenderer.send("gridnode-overlay-set", visible);
	},
	getVisible: () => ipcRenderer.invoke("gridnode-overlay-get"),
	onChanged: (callback) => {
		ipcRenderer.on("gridnode-overlay-changed", callback);
	}
});
contextBridge.exposeInMainWorld("electronLink", {
	onTick: (callback) => {
		ipcRenderer.on("link-tick", callback);
	},
	onPeersChanged: (callback) => {
		ipcRenderer.on("link-peers-changed", callback);
	},
	setBpm: (bpm) => {
		ipcRenderer.send("link-set-bpm", bpm);
	},
	setEnabled: (enabled) => {
		ipcRenderer.send("link-set-enabled", enabled);
	}
});
/**
* This file is used specifically for security reasons.
* Here you can access Nodejs stuff and inject functionality into
* the renderer thread (accessible there through the "window" object)
*
* WARNING!
* If you import anything from node_modules, then make sure that the package is specified
* in package.json > dependencies and NOT in devDependencies
*
* Example (injects window.myAPI.doAThing() into renderer thread):
*
*   import { contextBridge } from 'electron'
*
*   contextBridge.exposeInMainWorld('myAPI', {
*     doAThing: () => {}
*   })
*
* WARNING!
* If accessing Node functionality (like importing @electron/remote) then in your
* electron-main.ts you will need to set the following when you instantiate BrowserWindow:
*
* mainWindow = new BrowserWindow({
*   // ...
*   webPreferences: {
*     // ...
*     sandbox: false // <-- to be able to import @electron/remote in preload script
*   }
* }
*/
//#endregion
export {};
