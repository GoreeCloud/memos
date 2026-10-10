import { defineConfig } from "@playwright/test";

const baseURL = process.env.MEMOS_BROWSER_AUTHENTICATED_BASE_URL || "http://127.0.0.1:18082";
const storageState = "./test-results/browser-authenticated/.auth/admin.json";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./test-results/browser-authenticated",
  fullyParallel: false,
  workers: 1,
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
      name: "authenticated-setup",
      testMatch: /authenticated\.setup\.ts/,
      use: { viewport: { width: 1440, height: 900 }, colorScheme: "light" },
    },
    {
      name: "authenticated-desktop-light",
      testMatch: /authenticated-home\.spec\.ts/,
      dependencies: ["authenticated-setup"],
      use: { storageState, viewport: { width: 1440, height: 900 }, colorScheme: "light" },
    },
    {
      name: "authenticated-phone-dark",
      testMatch: /authenticated-home\.spec\.ts/,
      dependencies: ["authenticated-setup"],
      use: {
        storageState,
        viewport: { width: 390, height: 844 },
        colorScheme: "dark",
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "authenticated-tablet-forced-colors",
      testMatch: /authenticated-home\.spec\.ts/,
      dependencies: ["authenticated-setup"],
      use: {
        storageState,
        viewport: { width: 820, height: 1180 },
        colorScheme: "light",
        forcedColors: "active",
        hasTouch: true,
      },
    },
    {
      name: "authenticated-performance-desktop",
      testMatch: /authenticated-performance\.spec\.ts/,
      dependencies: ["authenticated-setup"],
      use: {
        storageState,
        viewport: { width: 1440, height: 900 },
        colorScheme: "light",
        reducedMotion: "no-preference",
      },
    },
    {
      name: "authenticated-phone-ar-rtl-reduced-transparency",
      testMatch: /authenticated-home\.spec\.ts/,
      dependencies: [
        "authenticated-desktop-light",
        "authenticated-phone-dark",
        "authenticated-tablet-forced-colors",
        "authenticated-performance-desktop",
      ],
      use: {
        storageState,
        viewport: { width: 390, height: 844 },
        colorScheme: "light",
        locale: "ar",
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
