/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { BrowserWindow } from 'electron';
import { Server } from 'node-osc';

let oscServer: Server | null = null;

export function setupOscListener(mainWindow: BrowserWindow) {
  try {
    // Listen on port 8000, bind to all interfaces
    oscServer = new Server(8000, '0.0.0.0', () => {
      console.log('OSC Server listening on port 8000');
    });

    oscServer.on('message', (msg) => {
      if (!msg || !Array.isArray(msg) || msg.length === 0) return;

      const [address, ...args] = msg;
      
      // Forward to Vue renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('osc-received', { address, args });
      }
    });

    oscServer.on('error', (err) => {
      console.error('OSC Server encountered an error:', err);
    });
  } catch (error) {
    console.error('Failed to start OSC Server:', error);
  }
}

export function closeOscListener() {
  if (oscServer) {
    try {
      oscServer.close();
      console.log('OSC Server shut down successfully');
    } catch (error) {
      console.error('Error shutting down OSC Server:', error);
    }
    oscServer = null;
  }
}
