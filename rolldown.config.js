import { defineConfig } from 'rolldown';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const external = [
  'electron',
  'serialport',
  'abletonlink',
  '@napolab/texture-bridge',
  ...builtinModules,
  ...builtinModules.map(m => `node:${m}`),
];

export default defineConfig([
  {
    input: 'src-electron/electron-main.ts',
    output: {
      file: 'dist-electron/main.js',
      format: 'esm',
    },
    external,
    platform: 'node',
    resolve: {
      alias: {
        'src': path.resolve(__dirname, './src'),
      },
    },
  },
  {
    input: 'src-electron/electron-preload.ts',
    output: {
      file: 'dist-electron/preload.js',
      format: 'esm',
    },
    external,
    platform: 'node',
    resolve: {
      alias: {
        'src': path.resolve(__dirname, './src'),
      },
    },
  }
]);
