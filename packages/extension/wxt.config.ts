import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Vinttea Remote Extension',
    version: '0.1.0',
    description: 'Control remoto para plataformas de streaming en PC',
    permissions: ['tabs', 'storage'],
    host_permissions: ['<all_urls>'],
  },
});
