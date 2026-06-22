/**
 * @type {import('electron-builder').Configuration}
 */
export default {
  appId: 'softdmx',
  productName: 'SoftDMX',
  directories: {
    output: 'dist/electron'
  },
  files: [
    'dist/spa/**/*',
    'dist-electron/**/*',
    'package.json'
  ],
  asar: true,
  asarUnpack: [
    '**/*.node'
  ],
  mac: {
    identity: null,
    icon: 'src-electron/icons/icon.icns',
    target: [
      'dir'
    ]
  },
  win: {
    icon: 'src-electron/icons/icon.ico',
    target: [
      'dir'
    ]
  }
};
