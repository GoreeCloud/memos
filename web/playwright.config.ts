import { defineConfig } from "@playwright/test";

const baseURL = process.env.MEMOS_BROWSER_BASE_URL || "http://127.0.0.1:18081";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: /auth-setup\.spec\.ts/,
  outputDir: "./test-results/browser",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  use: {
    baseURL,
    locale: "en-US",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-light",
      use: {
        viewport: { width: 1440, height: 900 },
        colorScheme: "light",
      },
    },
    {
      name: "phone-dark",
      use: {
        viewport: { width: 390, height: 844 },
        colorScheme: "dark",
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "tablet-forced-colors",
      use: {
        viewport: { width: 820, height: 1180 },
        colorScheme: "light",
        forcedColors: "active",
        hasTouch: true,
      },
    },
    {
      name: "phone-ar-rtl-reduced-transparency",
      use: {
        viewport: { width: 390, height: 844 },
        colorScheme: "light",
        locale: "ar",
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
