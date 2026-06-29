const { test, expect } = require('@playwright/test');

test.describe('Commit Workorder Test', () => {
  test('Login, set context to Isolatie/Insulation Maintenance and create workorder', async ({ page }) => {
    test.setTimeout(120000);
    
    // Stap 1: Navigeer naar de login pagina van Commit
    await page.goto('https://asbtest-apps.altrad.com/ords/test/r/altrad/commit/login?request=APEX_AUTHENTICATION=TESTAUTOMATIONAUTHENTICATION');
    await page.waitForSelector('#P9999_USERNAME', { state: 'visible' });
    await page.screenshot({ path: 'screenshots/01-login-page.png', fullPage: true });
    
    // Stap 2: Login met de verstrekte credentials
    await page.fill('#P9999_USERNAME', 'TESTAUTOMATION');
    await page.fill('#P9999_PASSWORD', 'TJVG4CFR9FGvzJRU5YOL');
    await page.click('#wwvFlowForm button[type="submit"]');
    
    // Wacht tot de applicatie geladen is na login
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/02-after-login.png', fullPage: true });
    
    // Stap 3: Zet de discipline/context op Isolatie/Insulation
    await page.getByRole('combobox', { name: /discipline/i }).click();
    await page.getByRole('option', { name: /isolatie|insulation/i }).click();
    await page.waitForLoadState('networkidle');
    
    // Stap 4: Zet Project Order Type op Maintenance
    await page.getByRole('combobox', { name: /project order type/i }).click();
    await page.getByRole('option', { name: /maintenance/i }).click();
    await page.waitForLoadState('networkidle');
    
    // Stap 5: Selecteer project "TestAutomation"
    await page.getByRole('combobox', { name: /project$/i }).click();
    await page.getByRole('option', { name: 'TestAutomation' }).click();
    await page.waitForLoadState('networkidle');
    
    // Stap 6: Selecteer project order "Testautomation Insulation PO"
    await page.getByRole('combobox', { name: /project order/i }).click();
    await page.getByRole('option', { name: 'Testautomation Insulation PO' }).click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/03-context-configured.png', fullPage: true });
    
    // Stap 7: Maak een nieuwe workorder aan
    await page.getByRole('button', { name: /new workorder|create workorder|nieuwe workorder/i }).click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/04-workorder-form.png', fullPage: true });
    
    // Stap 8: Sla de workorder op
    await page.getByRole('button', { name: /save|opslaan/i }).click();
    await page.waitForLoadState('networkidle');
    
    // Verificatie: controleer of de workorder succesvol opgeslagen is
    await expect(page.getByText(/success|succes|opgeslagen|saved/i).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/05-workorder-saved.png', fullPage: true });
  });
});