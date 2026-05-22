import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Tests run with vitest in a Node environment by default. A handful of
 * suites that touch `window` / DOM globals (heartbeat, ConnectionStatus,
 * etc.) opt into `jsdom` via the per-file `// @vitest-environment jsdom`
 * pragma so we don't pay the jsdom cost for every unit test.
 *
 * The `@/*` alias mirrors `tsconfig.json` and `vite.config.js`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/__mocks__/**',
        'src/**/*.d.ts',
        'src/data/**',
      ],
    },
  },
});
