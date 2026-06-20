/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useShowStore } from './show';
import { shouldApplySessionEpoch } from 'src/utils/session-epoch';

export const useSessionStore = defineStore('session', () => {
  const userName = ref('local');
  const role = ref<'primary' | 'secondary' | 'viewer'>('primary');

  function bumpSessionEpoch() {
    const showStore = useShowStore();
    showStore.updateDocument((doc) => {
      doc.meta.sessionEpoch = (doc.meta.sessionEpoch ?? 0) + 1;
      doc.meta.modifiedBy = userName.value;
      doc.meta.modified = new Date().toISOString();
    });
    return showStore.document.meta.sessionEpoch ?? 0;
  }

  function canApplyRemoteEpoch(incomingEpoch: number): boolean {
    const current = useShowStore().document.meta.sessionEpoch ?? 0;
    return shouldApplySessionEpoch(current, incomingEpoch);
  }

  return {
    userName,
    role,
    bumpSessionEpoch,
    canApplyRemoteEpoch,
  };
});
