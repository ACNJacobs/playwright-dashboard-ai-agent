import { test, expect } from '@playwright/test';

// Presentatie-test: Altrad ASB Test Automation
// VOLLEDIGE workflow — trage site = lange wachttijden

test('Altrad ASB - Volledige Workflow', async ({ page }) => {
  // 3 minuten timeout voor deze trage site
  test.setTimeout(180000);

  // ============================================
  // STAP 1: Inloggen (of controleer of al ingelogd)
  // ============================================
  await page.goto('https://asbtest-apps.altrad.com/ords/test/r/altrad/commit/login?request=APEX_AUTHENTICATION=TESTAUTOMATIONAUTHENTICATION');
  await page.waitForLoadState('networkidle');
  
  const usernameField = page.getByRole('textbox', { name: 'Username' });
  const isLoginPage = await usernameField.isVisible().catch(() => false);
  
  if (isLoginPage) {
    await usernameField.fill('TESTAUTOMATION');
    await page.getByRole('textbox', { name: 'Password' }).fill('TJVG4CFR9FGvzJRU5YOL');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForLoadState('networkidle');
    
    try {
      const projectBtn = page.getByRole('button', { name: '00000002 Test Automation' });
      await projectBtn.waitFor({ state: 'visible', timeout: 15000 });
      await projectBtn.click();
    } catch (e) {
      console.log('Project selectie overgeslagen');
    }
    
    try {
      const settingsIframe = page.locator('iframe[title="Settings - Context Preferences"]');
      await settingsIframe.waitFor({ state: 'attached', timeout: 10000 });
      await settingsIframe.contentFrame().getByLabel('Discipline').selectOption('1');
      await settingsIframe.contentFrame().getByLabel('Project Order Type').selectOption('53026660331838090825938496646896428150');
      await settingsIframe.contentFrame().getByRole('combobox', { name: 'Project / Site Code' }).click();
      await page.getByRole('option', { name: 'TestAutomation' }).click();
      await settingsIframe.contentFrame().getByRole('combobox', { name: 'Project Order', exact: true }).click();
      await page.getByRole('option', { name: '- Testautomation Insulation PO' }).click();
      await settingsIframe.contentFrame().getByRole('button', { name: 'Save Context' }).click();
      await settingsIframe.waitFor({ state: 'detached', timeout: 10000 });
    } catch (e) {
      console.log('Context preferences overgeslagen');
    }
  } else {
    console.log('Al ingelogd — ga direct verder');
  }

  // ============================================
  // STAP 2: Navigeren naar Contract
  // ============================================
  await page.locator('.fa.fa-archive').first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // EXTRA wachten voor trage site
  
  await page.getByRole('link', { name: '2606043' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.getByRole('link', { name: 'Testautomation Contract' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await expect(page.locator('text=Commit').first()).toBeVisible();
  console.log('✅ Contract pagina geladen');

  // ============================================
  // STAP 3: Open Advanced menu (gears icoon)
  // ============================================
  await page.locator('.fa.fa-gears').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000); // EXTRA wachten tot menu opent
  console.log('✅ Advanced menu geopend');

  // ============================================
  // STAP 4: Verificatie — controleer of Advanced menu correct geladen is
  // ============================================
  // Controleer of "Calculations" heading zichtbaar is in het menu
  const calculationsHeading = page.getByRole('heading', { name: 'Calculations' });
  await calculationsHeading.waitFor({ state: 'visible', timeout: 15000 });
  await expect(calculationsHeading).toBeVisible();
  
  // Controleer of "Setup" heading zichtbaar is
  const setupHeading = page.getByRole('heading', { name: 'Setup' });
  await expect(setupHeading).toBeVisible();
  
  console.log('✅ Volledige workflow succesvol — ingelogd, contract geopend, Advanced menu getoond!');
});