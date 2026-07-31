import path from 'node:path';
import react from '@vitejs/plugin-react';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // tsconfig keeps `jsx: preserve` for Next.js; the React plugin transforms
  // JSX for tests regardless of the tsconfig setting.
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        // react-konva host adapter: requires the GPU-backed `canvas` package and
        // real DOM layout, so it is exercised in browser e2e tests rather than
        // the jsdom unit environment.
        'features/preview/engine/vehicle-canvas.tsx',
      ],
    },
  },
});
