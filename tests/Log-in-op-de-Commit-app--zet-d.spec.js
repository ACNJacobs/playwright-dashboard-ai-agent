const { test, expect } = require('@playwright/test');

test('Commit app - Create Workorder flow', async ({ page }) => {
  // Timeout instellen op 120000ms zoals gevraagd
  test.setTimeout(120000);
  
  // Stap 1: Navigeer naar de Commit login pagina
  await page.goto('https://asbtest-apps.altrad.com/ords/test/r/altrad/commit/login?request=APEX_AUTHENTICATION=TESTAUTOMATIONAUTHENTICATION');
  await page.waitForLoadState('networkidle');
  
  // Stap 2: Login met de verstrekte credentials (exact zoals gespecificeerd)
  await page.fill('#P9999_USERNAME', 'TESTAUTOMATION');
  await page.fill('#P9999_PASSWORD', 'TJVG4CFR9FGvzJRU5YOL');
  await page.click('#wwvFlowForm button[type="submit"]');
  
  // Wacht tot de applicatie geladen is na authenticatie
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/01-na-login.png', fullPage: true });
  
  // Stap 3: Stel de discipline in op Isolatie/Insulation
  // Zoek de discipline dropdown en selecteer Isolatie
  await page.getByRole('combobox', { name: /discipline/i }).click();
  await page.waitForLoadState('networkidle');
  await page.getByRole('option', { name: /insulation|isolatie/i }).click();
  await page.waitForLoadState('networkidle');
  
  // Stap 4: Stel Project Order Type in op Maintenance
  await page.getByRole('combobox', { name: /project order type/i }).click();
  await page.waitForLoadState('networkidle');
  await page.getByRole('option', { name: 'Maintenance' }).click();
  await page.waitForLoadState('networkidle');
  
  // Stap 5: Selecteer project "TestAutomation"
  await page.getByRole('combobox', { name: /project/i }).click();
  await page.waitForLoadState('networkidle');
  await page.getByRole('option', { name: 'TestAutomation' }).click();
  await page.waitForLoadState('networkidle');
  
  // Stap 6: Selecteer project order "Testautomation Insulation PO"
  await page.getByRole('combobox', { name: /project order/i }).click();
  await page.waitForLoadState('networkidle');
  await page.getByRole('option', { name: 'Testautomation Insulation PO' }).click();
  await page.waitForLoadState('networkidle');
  
  // Screenshot na het instellen van de context
  await page.screenshot({ path: 'screenshots/02-context-ingesteld.png', fullPage: true });
  
  // Stap 7: Maak een nieuwe workorder aan
  // Zoek de knop voor het aanmaken van een nieuwe workorder
  await page.getByRole('button', { name: /new|create|nieuw|aanmaken/i }).click();
  await page.waitForLoadState('networkidle');
  
  // Stap 8: Vul de verplichte velden in voor de workorder
  // Vul een beschrijving in (indien het veld beschikbaar is)
  const descriptionField = page.getByRole('textbox', { name: /description|beschrijving|workorder description/i });
  await descriptionField.waitFor({ state: 'visible', timeout: 10000 });
  await descriptionField.fill('TestAutomation Workorder - Insulation Maintenance');
  
  // Vul eventuele andere verplichte velden in
  // Controleer of er een datum veld is en vul deze indien nodig
  const dateField = page.getByRole('textbox', { name: /date|datum|planned date|start date/i });
  if (await dateField.isVisible().catch(() => false)) {
    await dateField.fill(new Date().toISOString().split('T')[0]);
  }
  
  // Screenshot voor het opslaan
  await page.screenshot({ path: 'screenshots/03-workorder-ingevuld.png', fullPage: true });
  
  // Stap 9: Sla de workorder op
  await page.getByRole('button', { name: /save|opslaan|submit/i }).click();
  
  // Wacht tot de save actie voltooid is
  await page.waitForLoadState('networkidle');
  
  // Screenshot na het opslaan
  await page.screenshot({ path: 'screenshots/04-workorder-opgeslagen.png', fullPage: true });
  
  // Verificatie: Controleer of de workorder succesvol is opgeslagen
  // Dit kan door te controleren op een succesmelding of door te verifiëren dat we terug zijn op de overzichtspagina
  await expect(page.getByText(/success|succes|saved|opgeslagen|created|aangemaakt/i).first()).toBeVisible