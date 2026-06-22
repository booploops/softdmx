declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
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

