import { defineConfig } from 'vitest/config';

// Tous les tests de ce paquet touchent l'émulateur : le garde-fou refuse de les lancer ailleurs.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['@ph/config/vitest/garde-emulateur'],
    fileParallelism: false,
  },
});
