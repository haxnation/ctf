import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // Simulates a browser environment (DOM, window, etc.)
    include: ['tests/unit/**/*.test.js'], // Only run files in the unit folder
  },
});