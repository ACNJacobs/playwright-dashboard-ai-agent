# Playwright Handleiding voor Beginners

> **Copyright (c) 2026 Ton Jacobs. All rights reserved.**
> 
> Dit document is onderdeel van de Playwright Test Suite.

## Start de server 
1. node server.js

## Inhoudsopgave
1. [Wat is Playwright?](#1-wat-is-playwright)
2. [Projectstructuur](#2-projectstructuur)
3. [Je Eerste Test Schrijven](#3-je-eerste-test-schrijven)
4. [Assertions (Controles)](#4-assertions-controles)
5. [Elementen Selecteren](#5-elementen-selecteren)
6. [Acties Uitvoeren](#6-acties-uitvoeren)
7. [Tests Uitvoeren](#7-tests-uitvoeren)
8. [Handige Tips](#8-handige-tips)

---

## 1. Wat is Playwright?

Playwright is een tool om **automatisch websites te testen**. Het opent een echte browser (Chrome, Firefox, Safari) en simuleert wat een gebruiker doet: klikken, typen, navigeren.

### Waarom Playwright?
- **Snel**: Tests draaien parallel
- **Betrouwbaar**: Wacht automatisch tot elementen klaar zijn
- **Cross-browser**: Werkt in Chrome, Firefox én Safari
- **Codegen**: Kan je handelingen automatisch omzetten in code

---

## 2. Projectstructuur

```
playwright/
├── tests/
│   └── wikipedia.spec.js     ← Hier staan je tests
├── package.json              ← Dependencies
└── hello-playwright.js       ← Oud script (niet meer nodig)
```

### Belangrijk verschil:
| Bestand | Doel |
|---------|------|
| `hello-playwright.js` | Gewoon Node.js script (zonder test framework) |
| `tests/*.spec.js` | Officiële Playwright Test (met assertions) |

---

## 3. Je Eerste Test Schrijven

### Basisstructuur

```javascript
const { test, expect } = require('@playwright/test');

test('beschrijving van wat je test', async ({ page }) => {
  // 1. Ga naar een pagina
  await page.goto('https://www.wikipedia.org');
  
  // 2. Doe iets (klik, typ, etc.)
  await page.fill('input[name="search"]', 'Playwright');
  await page.press('input[name="search"]', 'Enter');
  
  // 3. Controleer of het resultaat correct is
  await expect(page).toHaveTitle(/Playwright/);
});
```

### Uitleg per regel:

| Code | Wat doet het? |
|------|---------------|
| `const { test, expect } = ...` | Importeer de test functies |
| `test('...', async ({ page }) => {` | Definieer een test die een browserpagina krijgt |
| `await page.goto('...')` | Navigeer naar een URL |
| `await page.fill('...', '...')` | Vul tekst in een veld |
| `await page.press('...', 'Enter')` | Druk op een toets |
| `await expect(...).toHaveTitle(...)` | Controleer of de titel klopt |

---

## 4. Assertions (Controles)

Assertions zijn **controles** die verifiëren of iets correct is. Als een assertion faalt, faalt de test.

### Veelgebruikte assertions:

```javascript
// Titel controleren
await expect(page).toHaveTitle('Wikipedia');
await expect(page).toHaveTitle(/Playwright/);  // Reguliere expressie

// URL controleren
await expect(page).toHaveURL('https://nl.wikipedia.org/wiki/Playwright');
await expect(page).toHaveURL(/wiki\/Playwright/);

// Tekst controleren
await expect(page.locator('h1')).toHaveText('Playwright');
await expect(page.locator('body')).toContainText('automatisch testen');

// Zichtbaarheid
await expect(page.locator('.success')).toBeVisible();
await expect(page.locator('.error')).toBeHidden();

// Aantal elementen
await expect(page.locator('.result')).toHaveCount(10);

// Waarde van input
await expect(page.locator('#email')).toHaveValue('test@example.com');

// Attributen
await expect(page.locator('img')).toHaveAttribute('alt', 'Logo');

// Checkbox
await expect(page.locator('#terms')).toBeChecked();
```

### Bedragen en Prijzen Controleren

Vaak wil je controleren of een bedrag correct is, bijvoorbeeld een totaalprijs of saldo.

#### Methode 1: Exacte tekst vergelijken
```javascript
// Controleer of het bedrag exact overeenkomt
const bedragElement = page.locator('.totaal-bedrag');
await expect(bedragElement).toHaveText('€ 150,00');
```

#### Methode 2: Deel van de tekst controleren
```javascript
// Controleer of het bedrag de verwachte waarde bevat
await expect(bedragElement).toContainText('150,00');
```

#### Methode 3: Numerieke vergelijking (meest flexibel)
```javascript
// Haal het bedrag op als tekst en converteer naar getal
const bedragTekst = await bedragElement.textContent();

// Verwijder alle niet-numerieke tekens (€, spaties) en converteer
const bedrag = parseFloat(
  bedragTekst
    .replace('€', '')        // Verwijder valutateken
    .replace(/\s/g, '')      // Verwijder spaties
    .replace(',', '.')        // Nederlandse komma naar punt
);

// Vergelijk met verwacht bedrag
expect(bedrag).toBe(150.00);

// Of: controleer of bedrag binnen een range ligt
expect(bedrag).toBeGreaterThan(100);
expect(bedrag).toBeLessThan(200);

// Of: controleer met tolerantie (bijv. voor afrondingsverschillen)
expect(bedrag).toBeCloseTo(150.00, 2);  // 2 decimalen tolerantie
```

#### Methode 4: Meerdere bedragen controleren
```javascript
// Controleer een lijst van prijzen
const prijzen = await page.locator('.prijs').allTextContents();
const verwachtePrijzen = ['€ 10,00', '€ 25,00', '€ 15,00'];

expect(prijzen).toEqual(verwachtePrijzen);

// Of: sommeer alle prijzen
let totaal = 0;
for (const prijsTekst of prijzen) {
  const prijs = parseFloat(prijsTekst.replace(/[^0-9,]/g, '').replace(',', '.'));
  totaal += prijs;
}
expect(totaal).toBe(50.00);
```

#### Voorbeeld: Winkelwagen controleren
```javascript
test('winkelwagen totaal is correct', async ({ page }) => {
  await page.goto('https://voorbeeld.com/winkelwagen');
  
  // Producten toevoegen
  await page.click('text=Product A');
  await page.click('text=Product B');
  
  // Ga naar winkelwagen
  await page.click('.winkelwagen-link');
  
  // Controleer subtotaal
  const subtotaal = await page.locator('.subtotaal').textContent();
  expect(parseFloat(subtotaal.replace(/[^0-9,]/g, '').replace(',', '.'))).toBe(75.00);
  
  // Controleer verzendkosten
  const verzendkosten = await page.locator('.verzendkosten').textContent();
  expect(parseFloat(verzendkosten.replace(/[^0-9,]/g, '').replace(',', '.'))).toBe(5.95);
  
  // Controleer totaal
  const totaal = await page.locator('.totaal').textContent();
  expect(parseFloat(totaal.replace(/[^0-9,]/g, '').replace(',', '.'))).toBe(80.95);
});
```

### Wachten op iets

```javascript
// Wacht tot een element zichtbaar is
await page.waitForSelector('.loading', { state: 'hidden' });

// Wacht tot netwerkverkeer stopt
await page.waitForLoadState('networkidle');
```

---

## 5. Elementen Selecteren

Playwright gebruikt **CSS selectors** om elementen te vinden.

### Veelgebruikte selectors:

```javascript
// Op tag naam
page.locator('button')

// Op class
page.locator('.btn-primary')

// Op ID
page.locator('#submit-button')

// Op attribuut
page.locator('[data-testid="login"]')
page.locator('input[name="email"]')

// Op tekst
page.locator('text=Inloggen')
page.locator('button:has-text("Verzenden")')

// Combinaties
page.locator('nav .active')           // .active binnen nav
page.locator('button[type="submit"]') // submit button
```

### Tips voor goede selectors:
- ✅ Gebruik `data-testid` attributen (meest stabiel)
- ✅ Gebruik semantische HTML (`button`, `input[name="..."]`)
- ❌ Vermijd classes die vaak veranderen (bijv. `.css-1a2b3c`)
- ❌ Vermijd XPath (moeilijk te lezen)

---

## 6. Acties Uitvoeren

### Klikken

```javascript
await page.click('button');
await page.click('text=Akkoord');
await page.click('button:has-text("Verzenden")');
```

### Typen

```javascript
await page.fill('#email', 'test@example.com');     // Vult het hele veld
await page.type('#search', 'Playwright');           // Typt letter voor letter
await page.press('#search', 'Enter');               // Drukt op Enter
```

### Dropdowns

```javascript
await page.selectOption('#country', 'Nederland');
await page.selectOption('#country', { label: 'Nederland' });
```

### Checkboxen en radio buttons

```javascript
await page.check('#terms');
await page.uncheck('#newsletter');
```

### Scrollen

```javascript
await page.locator('#footer').scrollIntoViewIfNeeded();
```

### Screenshots maken

```javascript
await page.screenshot({ path: 'resultaat.png' });
await page.locator('.chart').screenshot({ path: 'chart.png' });
```

---

## 7. Snippet Knoppen (Dashboard)

In het **Playwright Dashboard** (tab ➕ Nieuwe Test) kun je gebruik maken van **snippet knoppen** om snel code in te voegen.

### Hoe werkt het?
1. Open het Dashboard: `http://localhost:3000`
2. Ga naar de tab **➕ Nieuwe Test**
3. Klik op een snippet knop boven het code veld
4. De code wordt automatisch ingevoegd op de cursorpositie
5. Vul de placeholders in (bijv. `URL`, `SELECTOR`, `TEKST`)

### Beschikbare snippets:

| Knop | Wat doet het? | Voorbeeld output |
|------|---------------|------------------|
| 📄 **Template** | Voegt een basis test template in | `test('NAAM', async ({ page }) => { ... })` |
| 🔗 **Goto** | Navigeer naar een URL | `await page.goto('URL');` |
| 🖱️ **Click** | Klik op een element | `await page.locator('SELECTOR').click();` |
| ⌨️ **Fill** | Vul tekst in | `await page.locator('SELECTOR').fill('TEKST');` |
| ✅ **Expect Text** | Controleer tekst | `await expect(page.locator('SELECTOR')).toHaveText('TEKST');` |
| 👁️ **Expect Visible** | Controleer zichtbaarheid | `await expect(page.locator('SELECTOR')).toBeVisible();` |
| 💰 **Expect Price** | Controleer prijs/bedrag | `const priceText = await page.locator('SELECTOR').textContent();` |
| 📸 **Screenshot** | Maak een screenshot | `await page.screenshot({ path: 'screenshots/NAAM.png' });` |
| ⏳ **Wait** | Wacht even | `await page.waitForTimeout(1000);` |
| 🎥 **Video** | Video opname info | Commentaar met uitleg |

### Tip:
Gebruik **Codegen** (tab 🎥 Codegen) om de juiste selectors te bepalen, en plak daarna de gegenereerde code in het code veld. Vul aan met de snippet knoppen voor assertions en extra acties.

---

## 8. Tests Uitvoeren

### Basiscommando's

```bash
# Alle tests uitvoeren
npx playwright test

# Specifieke test uitvoeren
npx playwright test wikipedia.spec.js

# Met zichtbare browser
npx playwright test --headed

# Debug modus (stopt bij elke stap)
npx playwright test --debug

# Alleen in Chrome
npx playwright test --project=chromium

# Rapport bekijken
npx playwright show-report
```

### Wat gebeurt er bij een fout?

Playwright maakt automatisch:
- **Screenshot** van het moment van de fout
- **Video** van de test
- **Trace** (stap-voor-stap log)

Deze staan in de `test-results/` map.

---

## 8. Handige Tips

### Tip 1: Gebruik `data-testid`

Voeg in je HTML dit toe:
```html
<button data-testid="submit-button">Verzenden</button>
```

Selecteer dan in je test:
```javascript
await page.click('[data-testid="submit-button"]');
```

Dit is het meest stabiel omdat het niet verandert bij design updates.

### Tip 2: Herbruikbare stappen

```javascript
// In een apart bestand: helpers.js
async function login(page, email, password) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
}

module.exports = { login };

// In je test:
const { login } = require('./helpers');

test('profiel bekijken', async ({ page }) => {
  await login(page, 'test@example.com', 'wachtwoord');
  await expect(page).toHaveURL('/dashboard');
});
```

### Tip 3: Meerdere tests in één bestand

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Wikipedia', () => {
  test('zoeken naar Playwright', async ({ page }) => {
    await page.goto('https://www.wikipedia.org');
    await page.fill('input[name="search"]', 'Playwright');
    await page.press('input[name="search"]', 'Enter');
    await expect(page).toHaveTitle(/Playwright/);
  });

  test('zoeken naar JavaScript', async ({ page }) => {
    await page.goto('https://www.wikipedia.org');
    await page.fill('input[name="search"]', 'JavaScript');
    await page.press('input[name="search"]', 'Enter');
    await expect(page).toHaveTitle(/JavaScript/);
  });
});
```

### Tip 4: Voor en na elke test

```javascript
test.beforeEach(async ({ page }) => {
  // Dit wordt voor ELKE test uitgevoerd
  await page.goto('https://www.wikipedia.org');
});

test('zoeken', async ({ page }) => {
  // page staat al op Wikipedia
  await page.fill('input[name="search"]', 'Playwright');
  await page.press('input[name="search"]', 'Enter');
  await expect(page).toHaveTitle(/Playwright/);
});
```

### Tip 5: Codegen gebruiken

Laat Playwright je handelingen opnemen:

```bash
npx playwright codegen wikipedia.org
```

- Er opent een browser
- Alles wat je doet wordt omgezet in code
- Kopieer de code naar je testbestand
- Pas aan waar nodig

---

## Snelle Referentie

| Wil je... | Gebruik dan... |
|-----------|----------------|
| Navigeren | `await page.goto('https://...')` |
| Klikken | `await page.click('selector')` |
| Typen | `await page.fill('selector', 'tekst')` |
| Enter drukken | `await page.press('selector', 'Enter')` |
| Titel checken | `await expect(page).toHaveTitle('...')` |
| Tekst checken | `await expect(locator).toHaveText('...')` |
| Zichtbaar checken | `await expect(locator).toBeVisible()` |
| Screenshot | `await page.screenshot({ path: '...' })` |
| Wachten | `await page.waitForSelector('...')` |

---

## Volgende Stappen

1. **Oefen** met het schrijven van tests voor je eigen website
2. **Gebruik `data-testid`** voor stabiele selectors
3. **Bekijk rapporten** met `npx playwright show-report`
4. **Lees de documentatie**: https://playwright.dev

Succes met het testen! 🎭
