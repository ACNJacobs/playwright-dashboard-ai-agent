const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Scaff App Smoke Test', () => {
test.setTimeout(120000);

test('Inloggen en basispagina verifiëren', async ({ page }) => {
// Zorg dat de screenshots map bestaat
const screenshotDir = 'screenshots';
if (!fs.existsSync(screenshotDir)) {
fs.mkdirSync(screenshotDir, { recursive: true });
}

// 1. Navigeer naar de Scaff App home pagina
await page.goto('http://localhost:8080/ords/r/apex_dev/scaff-app/home');
await page.waitForLoadState('networkidle');

// 2. Verifieer dat het login formulier zichtbaar is
await expect(page.locator('#wwvFlowForm')).toBeVisible();
await expect(page.locator('#P9999_USERNAME')).toBeVisible();
await expect(page.locator('#P9999_PASSWORD')).toBeVisible();

// 3. Screenshot van de login pagina
await page.screenshot({ path: path.join(screenshotDir, '01-login-pagina.png'), fullPage: true });

// 4. Vul credentials in
await page.fill('#P9999_USERNAME', 'ADMIN');
await page.fill('#P9999_PASSWORD', 'Welkom_APEX_2026!');

// 5. Submit het formulier
await page.locator('#wwvFlowForm button[type="submit"]').click();

// 6. Wacht op redirect / laden
await page.waitForLoadState('networkidle');

// 7. Verifieer succesvolle login: #main zichtbaar en geen foutmeldingen
await expect(page.locator('#main')).toBeVisible({ timeout: 30000 });

const foutmelding = page.locator('.t-Alert--danger, .t-Alert--error');
await expect(foutmelding).toHaveCount(0);

// 8. Screenshot na succesvol inloggen
await page.screenshot({ path: path.join(screenshotDir, '02-na-inloggen.png'), fullPage: true });

// 9. Verifieer dat we niet meer op de login pagina zitten
const huidigeUrl = page.url();
expect(huidigeUrl).not.toContain('/login/');
});
});