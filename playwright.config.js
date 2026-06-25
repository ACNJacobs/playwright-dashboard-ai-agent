// Copyright (c) 2026 Ton Jacobs. All rights reserved.
// This file is part of the Playwright Test Suite.

// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',

  /* Maximale tijd per test (30 seconden) */
  timeout: 30 * 1000,

  /* Verwachte resultaten in parallel uitvoeren */
  expect: {
    /* Maximale tijd voor assertions (5 seconden) */
    timeout: 5000
  },

  /* Aantal tests dat parallel mag draaien */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter configuratie - HTML rapportage zoals Robot Framework */
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never'  // Handmatig openen met npx playwright show-report
    }],
    ['list']  // Console output
  ],

  /* Gedeelde instellingen voor alle tests */
  use: {
    /* Basis URL voor je applicatie */
    baseURL: 'https://www.wikipedia.org',

    /* Trace, screenshots en video bij fouten */
    trace: 'on-first-retry',      // Trace bij eerste poging na fout
    screenshot: 'only-on-failure', // Screenshot alleen bij falen
    video: 'on',                   // Video altijd opnemen

    /* Headless mode - zet op false om browser te zien */
    headless: false,

    /* Vertraag acties in headed mode (milliseconden) - zet hoger voor langzamere tests */
    launchOptions: {
      slowMo: 2000,
    },

    /* Viewport grootte */
    viewport: { width: 1280, height: 720 },

    /* Locale en tijdzone */
    locale: 'nl-NL',
    timezoneId: 'Europe/Amsterdam',
  },

  /* Projecten = verschillende browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
