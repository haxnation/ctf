import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  /* Let Playwright start the local dev server before starting the tests */
  webServer: {
    command: 'npx http-server ./ -p 8080 -s',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:8080',
    trace: 'on-first-retry',
  },
});