declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
}

interface FrontendMenuItem {
  role?: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'pasteAndMatchStyle' | 'delete' | 'selectAll' | 'reload' | 'forceReload' | 'toggleDevTools' | 'resetZoom' | 'zoomIn' | 'zoomOut' | 'togglefullscreen' | 'window' | 'minimize' | 'close' | 'help' | 'about' | 'services' | 'hide' | 'hideOthers' | 'unhide' | 'quit' | 'startSpeaking' | 'stopSpeaking' | 'zoom' | 'front' | 'appMenu' | 'fileMenu' | 'editMenu' | 'viewMenu' | 'shareMenu' | 'recentDocuments' | 'toggleTabBar' | 'selectNextTab' | 'selectPreviousTab' | 'mergeAllWindows' | 'moveTabToNewWindow' | 'windowMenu';
  type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  label?: string;
  sublabel?: string;
  toolTip?: string;
  accelerator?: string;
  icon?: string;
  enabled?: boolean;
  visible?: boolean;
  checked?: boolean;
  id?: string;
  click?: () => void;
  submenu?: FrontendMenuItem[];
}

interface Window {
  electronAPI?: {
    getRemoteApiToken?: () => string | undefined;
    onOscMessage: (callback: (event: any, data: { address: string; args: any[] }) => void) => void;
    removeOscListener: () => void;
  };
  electronLink?: {
    onTick: (callback: (event: any, data: any) => void) => void;
    onPeersChanged: (callback: (event: any, numPeers: number) => void) => void;
    setBpm: (bpm: number) => void;
    setEnabled: (enabled: boolean) => void;
  };
  electronGridNode?: {
    setVisible: (visible: boolean) => void;
    getVisible: () => Promise<boolean>;
    onChanged: (callback: (event: any, visible: boolean) => void) => void;
  };
  electronVideo?: {
    listSenders: () => Promise<Array<{ name: string; appName?: string }>>;
    connect: (config: {
      kind: 'syphon' | 'spout';
      senderName: string;
      fps: number;
    }) => Promise<boolean>;
    disconnect: () => Promise<void>;
    getStatus: () => Promise<{ connected: boolean; platform: string }>;
    onFrame: (callback: (payload: { width: number; height: number; data: ArrayBuffer }) => void) => void;
    removeFrameListener: () => void;
  };
}

declare module '*?url' {
  const content: string;
  export default content;
}

declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module '*.css' {}
declare module '*.scss' {}
declare module '*.sass' {}


