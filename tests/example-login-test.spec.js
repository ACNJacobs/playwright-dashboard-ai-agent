const { test, expect } = require('@playwright/test');

test('Successful login to demoqa.com', async ({ page }) => {
  // Ga naar de login pagina
  await page.goto('https://demoqa.com/login');
  
  // Vul gebruikersnaam in
  await page.fill('#userName', 'testuser123');
  
  // Vul wachtwoord in
  await page.fill('#password', 'Password123!');
  
  // Klik op inloggen
  await page.click('#login');
  
  // Wacht tot de profielpagina geladen is
  await page.waitForSelector('#userName-value', { timeout: 10000 });
  
  // Controleer of de gebruikersnaam correct wordt weergegeven
  const userName = await page.textContent('#userName-value');
  expect(userName).toBe('testuser123');
  
  // Controleer of we op de juiste URL zijn
  await expect(page).toHaveURL('https://demoqa.com/profile');
  
  console.log('Login test geslaagd: Gebruiker is succesvol ingelogd en op profielpagina');
});

test('Failed login with invalid credentials', async ({ page }) => {
  // Ga naar de login pagina
  await page.goto('https://demoqa.com/login');
  
  // Vul ongeldige gebruikersnaam in
  await page.fill('#userName', 'invaliduser');
  
  // Vul ongeldig wachtwoord in
  await page.fill('#password', 'wrongpassword');
  
  // Klik op inloggen
  await page.click('#login');
  
  // Wacht op foutmelding
  await page.waitForSelector('#name', { timeout: 10000 });
  
  // Controleer of foutmelding zichtbaar is
  const errorMessage = await page.textContent('#name');
  expect(errorMessage).toContain('Invalid username or password!');
  
  // Controleer of we nog steeds op de login pagina zijn
  await expect(page).toHaveURL('https://demoqa.com/login');
  
  console.log('Failed login test geslaagd: Foutmelding wordt correct weergegeven');
});