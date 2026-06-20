/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AppState } from '../state/main';
import { DmxOutputDriver } from "./DmxOutputDriver";

export class GridNodeDriver implements DmxOutputDriver {
  constructor(private destinationId: string = "default-gridnode") {}

  async initialize(): Promise<void> {
    // Overlay visibility is controlled separately via gridnode-overlay.
  }

  send(dmxBuffer: Uint8Array): void {
    if (AppState.io) {
      // Emit the dense DMX array to the specific GridNode listener
      AppState.io.emit(`channels:update:${this.destinationId}`, Array.from(dmxBuffer));
    }
  }

  async destroy(): Promise<void> {
    // Cleanup window overlay visibility is handled by OutputManager updateDestinations check
  }
}
