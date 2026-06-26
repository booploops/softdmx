import { defineConfig } from 'histoire';
import { HstVue } from '@histoire/plugin-vue';

export default defineConfig({
  plugins: [HstVue()],
  setupFile: './src/histoire.setup.ts',
  theme: {
    title: 'SoftDMX Design System',
    favicon: 'favicon.ico',
  },
  tree: {
    groups: [
      { id: 'primitives', title: 'UI Primitives' },
      { id: 'tokens', title: 'Design Tokens' },
    ],
  },
});
