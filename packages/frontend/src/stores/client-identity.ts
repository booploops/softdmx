/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { ClientIdentity } from '@softdmx/engine';
import { useIOClient } from 'src/lib/io-client';

let handshakeHookInstalled = false;

function createLocalClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useClientIdentityStore = defineStore('client-identity', () => {
  const clientId = ref(createLocalClientId());
  const operatorLabel = ref<string | undefined>(undefined);
  const color = ref<string | undefined>(undefined);
  const priority = ref<number | undefined>(undefined);

  function applyIdentity(identity: Partial<ClientIdentity>) {
    if (identity.clientId) clientId.value = identity.clientId;
    if (identity.operatorLabel !== undefined) operatorLabel.value = identity.operatorLabel;
    if (identity.color !== undefined) color.value = identity.color;
    if (identity.priority !== undefined) priority.value = identity.priority;
  }

  function setOperatorProfile(label?: string, nextColor?: string) {
    operatorLabel.value = label;
    color.value = nextColor;
    sendHello();
  }

  function sendHello() {
    const socket = useIOClient();
    if (!socket.connected) return;
    socket.emit('client:hello', {
      clientId: clientId.value,
      operatorLabel: operatorLabel.value,
      color: color.value,
    });
  }

  if (!handshakeHookInstalled) {
    handshakeHookInstalled = true;
    const socket = useIOClient();
    socket.on('client:identity', (payload: Partial<ClientIdentity>) => {
      applyIdentity(payload);
    });
    socket.on('connect', () => {
      sendHello();
    });
    if (socket.connected) {
      sendHello();
    }
  }

  return {
    clientId,
    operatorLabel,
    color,
    priority,
    applyIdentity,
    setOperatorProfile,
    sendHello,
  };
});
