import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.yaml', '**/*.yml'],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
