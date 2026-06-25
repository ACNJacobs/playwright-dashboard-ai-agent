# Playwright Cheatsheet - Snelle Referentie

> **Copyright (c) 2026 Ton Jacobs. All rights reserved.**
> 
> Dit document is onderdeel van de Playwright Test Suite.

## 📁 Projectstructuur

```
playwright/
├── tests/                          ← Testbestanden (.spec.js)
├── test-results/                   ← Screenshots, video's, traces
├── playwright-report/              ← HTML rapportage
├── playwright.config.js            ← Configuratie
├── package.json                    ← Dependencies
└── PLAYWRIGHT_HANDLEIDING.md      ← Handleiding
```

---

## 🚀 Snelstart Commando's

| Commando | Wat doet het? |
|----------|---------------|
| `npm install` | Dependencies installeren |
| `npx playwright install` | Browsers downloaden |
| `npx playwright test` | Alle tests uitvoeren |
| `npx playwright test --headed` | Tests met zichtbare browser |
| `npx playwright test --debug` | Debug modus (stopt bij elke stap) |
| `npx playwright test --project=chromium` | Alleen in Chrome testen |
| `npx playwright test wikipedia.spec.js` | Specifieke test uitvoeren |
| `npx playwright show-report` | HTML rapport openen |
| `npx playwright codegen wikipedia.org` | Handelingen opnemen als code |

---

## 🖥️ Servers Starten

### Overzicht van alle servers

| Server | Poort | Commando | Doel |
|--------|-------|----------|------|
| **Dashboard** | 3000 | `node server.js` | Webapp voor testbeheer |
| **Rapport** | 9323 | `npx playwright show-report` | HTML testrapportage |
| **Video's** | 8080 | `python -m http.server 8080` | Lokale HTTP server voor video's |

---

### 1. Playwright Dashboard Server (Poort 3000)
```bash
cd D:\playwright
node server.js
```
- Opent: `http://localhost:3000`
- Features: Tests beheren, video's bekijken, screenshots, codegen
- Sluiten: `Ctrl + C`

### 2. Playwright HTML Rapport Server (Poort 9323)
```bash
cd D:\playwright
npx playwright show-report
```
- Opent: `http://localhost:9323`
- Toont: HTML testresultaten met video's en traces
- Sluiten: `Ctrl + C`

### 3. Lokale HTTP Server voor Video's (Poort 8080)
```bash
cd D:\playwright
python -m http.server 8080
```
- Opent: `http://localhost:8080`
- Doel: Video's (.webm) en screenshots serveren
- Sluiten: `Ctrl + C`

---

## 🎬 Video's Bekijken

### Video's vinden
```powershell
# Alle video's tonen
Get-ChildItem -Path "test-results" -Recurse -Filter "*.webm"
```

### Video openen
| Methode | Commando/Actie |
|---------|----------------|
| **VLC** | Dubbelklik `.webm` bestand |
| **Chrome** | Sleep `.webm` naar browser |
| **HTML player** | Open `http://localhost:8080/video-player.html` |

### Video converteren naar MP4
```bash
ffmpeg -i video.webm video.mp4
```

---

## 📝 Markdown naar DOCX Converteren

```bash
cd D:\playwright
python convert_to_docx.py
```

**Input:** `PLAYWRIGHT_HANDLEIDING.md`
**Output:** `PLAYWRIGHT_HANDLEIDING.docx`

---

## 🔧 Configuratie Bestanden

### `playwright.config.js` - Belangrijke instellingen
```javascript
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  use: {
    baseURL: 'https://www.wikipedia.org',
    headless: true,              // false = zichtbare browser
    screenshot: 'only-on-failure',
    video: 'on',                 // 'on' = altijd, 'retain-on-failure' = alleen bij fout
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

---

## 🧪 Test Schrijven - Snelle Voorbeelden

### Basis test
```javascript
const { test, expect } = require('@playwright/test');

test('mijn test', async ({ page }) => {
  await page.goto('https://example.com');
  await page.fill('#email', 'test@example.com');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### Meerdere tests groeperen
```javascript
test.describe('Login Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('succesvol inloggen', async ({ page }) => {
    // Test code hier
  });

  test('fout wachtwoord', async ({ page }) => {
    // Test code hier
  });
});
```

---

## 💰 Bedragen en Prijzen Controleren

### Exact bedrag vergelijken
```javascript
const bedrag = page.locator('.totaal-bedrag');
await expect(bedrag).toHaveText('€ 150,00');
```

### Deel van bedrag controleren
```javascript
await expect(bedrag).toContainText('150,00');
```

### Numerieke vergelijking (meest flexibel)
```javascript
const tekst = await bedrag.textContent();
const waarde = parseFloat(
  tekst
    .replace('€', '')
    .replace(/\s/g, '')
    .replace(',', '.')
);
expect(waarde).toBe(150.00);
```

### Vergelijkingen met tolerantie
```javascript
expect(waarde).toBeCloseTo(150.00, 2);  // 2 decimalen tolerantie
expect(waarde).toBeGreaterThan(100);
expect(waarde).toBeLessThan(200);
```

### Meerdere prijzen controleren
```javascript
const prijzen = await page.locator('.prijs').allTextContents();
let totaal = 0;
for (const prijs of prijzen) {
  totaal += parseFloat(prijs.replace(/[^0-9,]/g, '').replace(',', '.'));
}
expect(totaal).toBe(50.00);
```

### Voorbeeld: Winkelwagen
```javascript
test('totaal is correct', async ({ page }) => {
  await page.goto('/winkelwagen');
  
  const subtotaal = await page.locator('.subtotaal').textContent();
  expect(parseFloat(subtotaal.replace(/[^0-9,]/g, '').replace(',', '.'))).toBe(75.00);
  
  const verzendkosten = await page.locator('.verzendkosten').textContent();
  expect(parseFloat(verzendkosten.replace(/[^0-9,]/g, '').replace(',', '.'))).toBe(5.95);
  
  const totaal = await page.locator('.totaal').textContent();
  expect(parseFloat(totaal.replace(/[^0-9,]/g, '').replace(',', '.'))).toBe(80.95);
});
```

---

## 🛠️ Snippet Knoppen (Dashboard)

In het Dashboard (tab ➕ Nieuwe Test) kun je met één klik code snippets invoegen.

| Knop | Snippet | Beschrijving |
|------|---------|--------------|
| 📄 Template | `test('NAAM', async ({ page }) => { ... })` | Basis test structuur |
| 🔗 Goto | `await page.goto('URL');` | Navigeer naar URL |
| 🖱️ Click | `await page.locator('SELECTOR').click();` | Klik op element |
| ⌨️ Fill | `await page.locator('SELECTOR').fill('TEKST');` | Vul tekst in |
| ✅ Expect Text | `await expect(page.locator('SELECTOR')).toHaveText('TEKST');` | Controleer tekst |
| 👁️ Expect Visible | `await expect(page.locator('SELECTOR')).toBeVisible();` | Controleer zichtbaarheid |
| 💰 Expect Price | `const priceText = await page.locator('SELECTOR').textContent();` | Controleer prijs |
| 📸 Screenshot | `await page.screenshot({ path: 'screenshots/NAAM.png' });` | Maak screenshot |
| ⏳ Wait | `await page.waitForTimeout(1000);` | Wacht 1 seconde |
| 🎥 Video | Commentaar met uitleg | Video configuratie info |

**Tip:** Gebruik Codegen om selectors te bepalen, en vul aan met snippets voor assertions.

---

## ✅ Assertions (Controles)

| Assertion | Voorbeeld |
|-----------|-----------|
| Titel | `await expect(page).toHaveTitle('Wikipedia')` |
| URL | `await expect(page).toHaveURL('/dashboard')` |
| Tekst | `await expect(locator).toHaveText('Welkom')` |
| Bevat tekst | `await expect(locator).toContainText('Welkom')` |
| Zichtbaar | `await expect(locator).toBeVisible()` |
| Verborgen | `await expect(locator).toBeHidden()` |
| Aantal | `await expect(locator).toHaveCount(5)` |
| Waarde | `await expect(locator).toHaveValue('test')` |
| Attribuut | `await expect(locator).toHaveAttribute('href', '/home')` |
| Gecheckt | `await expect(locator).toBeChecked()` |

---

## 🖱️ Acties

| Actie | Code |
|-------|------|
| Navigeren | `await page.goto('https://...')` |
| Klikken | `await page.click('button')` |
| Dubbelklik | `await page.dblclick('button')` |
| Typen (vullen) | `await page.fill('#input', 'tekst')` |
| Typen (letter voor letter) | `await page.type('#input', 'tekst')` |
| Toets indrukken | `await page.press('#input', 'Enter')` |
| Dropdown | `await page.selectOption('#select', 'optie')` |
| Checkbox aan | `await page.check('#checkbox')` |
| Checkbox uit | `await page.uncheck('#checkbox')` |
| Scrollen | `await page.locator('#footer').scrollIntoViewIfNeeded()` |
| Screenshot | `await page.screenshot({ path: 'img.png' })` |

---

## 🔍 Selectors

| Selector | Voorbeeld |
|----------|-----------|
| ID | `#submit-button` |
| Class | `.btn-primary` |
| Tag | `button` |
| Attribuut | `[data-testid="login"]` |
| Naam | `input[name="email"]` |
| Tekst | `text=Inloggen` |
| Bevat tekst | `button:has-text("Verzenden")` |
| Combinatie | `nav .active` |

---

## 📊 Rapportage & Resultaten

### HTML Rapport openen
```bash
npx playwright show-report
```

### Resultaten map
```
test-results/
├── [test-naam]-chromium/
│   ├── test-failed-1.png       ← Screenshot bij fout
│   ├── video.webm              ← Video opname
│   └── error-context.md        ← Fout details
└── .last-run.json              ← Laatste run info
```

### Rapport map
```
playwright-report/
└── index.html                  ← Open in browser
```

---

## 🆘 Troubleshooting

| Probleem | Oplossing |
|----------|-----------|
| Browsers niet gevonden | `npx playwright install` |
| Tests falen onverwacht | `npx playwright test --debug` |
| Video's niet zichtbaar | Check `video: 'on'` in config |
| Screenshots ontbreken | Check `screenshot: 'only-on-failure'` |
| Poort 9323 bezet | Sluit andere `show-report` instantie |
| Poort 8080 bezet | Gebruik `python -m http.server 8081` |

---

## 📚 Nuttige Links

- **Playwright Docs:** https://playwright.dev
- **API Reference:** https://playwright.dev/docs/api/class-page
- **Selectors:** https://playwright.dev/docs/selectors
- **Assertions:** https://playwright.dev/docs/test-assertions

---

## 💡 Tips

1. **Gebruik `data-testid`** voor stabiele selectors
2. **Draai tests parallel** met `workers: 4` in config
3. **Bekijk video's** bij falende tests voor snelle debugging
4. **Gebruik `--headed`** als je wilt zien wat er gebeurt
5. **Gebruik `--debug`** als je stap-voor-stap wilt volgen

---

*Gegenereerd op: 2026-06-16*
*Project: D:\playwright*
