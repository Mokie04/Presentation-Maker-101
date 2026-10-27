import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      'next/font/local': path.resolve(process.cwd(), './tests/helpers/next-font-local.ts'),
    },
  },
});
