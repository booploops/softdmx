export const SIDEBAR_SHORTCUTS = [
  { id: 'audio', label: 'Audio', icon: 'graph', path: '/audio' },
  { id: 'patch', label: 'Patch', icon: 'plug', path: '/patch' },
  { id: 'pixel-map', label: 'Pixel Map', icon: 'symbol-color', path: '/pixel-map' },
  { id: 'visualizer', label: 'Visualizer', icon: 'device-camera-video', path: '/visualizer' },
  { id: 'bindings', label: 'Bindings', icon: 'link', path: '/bindings' },
  { id: 'timeline-desk', label: 'Timeline Desk', icon: 'timeline-view-icon', path: '/timeline-desk' },
  { id: 'settings-general', label: 'Settings: General', icon: 'settings', path: '/settings-general' },
  { id: 'settings-output', label: 'Settings: Output', icon: 'broadcast', path: '/settings-output-sync' },
] as const;

export type SidebarShortcutId = (typeof SIDEBAR_SHORTCUTS)[number]['id'];
