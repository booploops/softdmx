import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { Quasar } from 'quasar';
import quasarLang from 'quasar/lang/en-US';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import 'src/css/app.scss';

export function setupVue3({ app }: { app: ReturnType<typeof createApp> }) {
  app.use(createPinia());
  app.use(Quasar, { plugins: {}, lang: quasarLang });
}
