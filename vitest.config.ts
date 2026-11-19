import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // These predate Vitest and are written for node:test; they need their own runner.
    exclude: [
      ...configDefaults.exclude,
      'src/scripts/themeMotion.test.ts',
      'src/game/planes/classes/settings.test.ts',
      'src/game/planes/classes/virtualSteering.test.ts',
    ],
    environment: 'node',
  },
});
