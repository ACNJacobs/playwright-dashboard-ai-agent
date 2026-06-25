// Copyright (c) 2026 Ton Jacobs. All rights reserved.
// This file is part of the Playwright Test Suite.

const { chromium } = require('playwright');

(async () => {
  // 1. Browser starten (headless: false = je ziet het venster)
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // 2. Naar Wikipedia gaan
  await page.goto('https://www.wikipedia.org');

  // 3. Controleren of de titel correct is
  const title = await page.title();
  if (title !== 'Wikipedia') {
    throw new Error(`Verwachtte titel "Wikipedia", maar kreeg "${title}"`);
  }
  console.log('✅ Titel is correct:', title);

  // 4. Zoekveld invullen
  await page.fill('input[name="search"]', 'Playwright (software)');
  await page.press('input[name="search"]', 'Enter');

  // 5. Wachten tot de zoekresultatenpagina geladen is
  await page.waitForLoadState('networkidle');

  // 6. Controleren of de pagina het woord "Playwright" bevat
  const content = await page.textContent('body');
  if (!content.includes('Playwright')) {
    throw new Error('Woord "Playwright" niet gevonden op de pagina');
  }
  console.log('✅ Pagina bevat "Playwright"');

  // 7. Browser sluiten
  await browser.close();
  console.log('🎉 Test succesvol afgerond!');
})();
