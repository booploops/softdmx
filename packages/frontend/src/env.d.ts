/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
}

interface LinkTickData {
  bpm: number;
  beat: number;
  phase: number;
  numPeers: number;
  isNewBeat: boolean;
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
  electronTRPC?: unknown;
  electronAPI?: {
    getRemoteApiToken?: () => string | undefined;
    onOscMessage: (callback: (event: unknown, data: { address: string; args: unknown[] }) => void) => void;
    removeOscListener: () => void;
  };
  electronLink?: {
    onTick: (callback: (event: unknown, data: LinkTickData) => void) => void;
    onPeersChanged: (callback: (event: unknown, numPeers: number) => void) => void;
    setBpm: (bpm: number) => void;
    setEnabled: (enabled: boolean) => void;
  };
  electronGridNode?: {
    setVisible: (visible: boolean) => void;
    getVisible: () => Promise<boolean>;
    onChanged: (callback: (event: unknown, visible: boolean) => void) => void;
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


