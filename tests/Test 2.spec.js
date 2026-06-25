import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.wikipedia.org/');
  await page.getByRole('link', { name: 'Wikidata Open kennisbank' }).click();
  await page.getByRole('link', { name: 'trillionaire (Q2943539)' }).click();
  await page.getByRole('radio', { name: 'Wide' }).check();
  await page.getByRole('link', { name: 'USAFA Hosts Elon Musk (Image' }).click();
  await page.getByRole('link', { name: 'Elon Musk close-up (cropped).jpg', exact: true }).click();
  await page.getByRole('link', { name: 'United States Air Force', description: 'en:United States Air Force Academy' }).click();
  await page.getByRole('button', { name: 'Toggle Organization subsection' }).click();
  // Controleer of 'Board of Visitors' link zichtbaar is in de organisatie sectie
  await expect(page.getByRole('link', { name: 'Board of Visitors', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Board of Visitors', exact: true }).click();
  await page.getByText('Congressional oversight of').click();
  await page.getByText('Congressional oversight of').dblclick();
  await page.getByText('Congressional oversight of').click();
  await page.getByText('Congressional oversight of').click();
});