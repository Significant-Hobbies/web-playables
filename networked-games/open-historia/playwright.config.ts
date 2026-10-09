/**
 * Playwright config — desktop + mobile-viewport projects.
 *
 * Adds a `mobile` project (iPhone 13 = 390px wide, the fleet mobile target)
 * alongside the `desktop` baseline so mobile regressions are caught.
 *
 * Requires `@playwright/test` (a devDependency). Install with:
 *   pnpm install
 * Run only the mobile project:
 *   pnpm exec playwright test --project=mobile
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:43187',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm build && node scripts/serve-e2e.mjs',
    url: 'http://127.0.0.1:43187',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    // Desktop baseline.
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // Mobile-viewport project — iPhone 13 is 390px wide, the mobile target.
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
