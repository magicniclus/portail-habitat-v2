import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Aides des tests (aidesTest*.ts) : du code de test, pas de l'application.
      exclude: [
        'src/**/*.test.ts',
        'src/**/index.ts',
        'src/**/__tests__/**',
        'src/**/aidesTest*.ts',
      ],
      thresholds: { lines: 95, functions: 95, branches: 95, statements: 95 },
    },
  },
});
