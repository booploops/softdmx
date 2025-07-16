/*
 * Copyright (C) 2025-Present booploops and contributors
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui-store', () => {
  const currentTab = ref<'channels' | 'groups'>('groups')

  return { currentTab }
})
