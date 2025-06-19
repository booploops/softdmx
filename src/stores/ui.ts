import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui-store', () => {
  const currentTab = ref<'channels' | 'groups'>('channels')

  return { currentTab }
})
