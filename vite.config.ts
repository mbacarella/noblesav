import { defineConfig } from 'vite';

export default defineConfig({
  base: '/noblesav/',
  assetsInclude: ['**/*.yaml', '**/*.yml'],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
