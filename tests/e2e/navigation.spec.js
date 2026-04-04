import { test, expect } from '@playwright/test';

test.describe('HaxNation CTF Platform Navigation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Playwright will use a local server during the test
    await page.goto('http://localhost:8080'); 
  });

  test('should display the main navigation tabs correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/HaxNation — CTF Platform/);
    
    const practiceTab = page.locator('#tab-practice');
    const competeTab = page.locator('#tab-compete');
    
    await expect(practiceTab).toBeVisible();
    await expect(competeTab).toBeVisible();
  });

  test('should toggle between Practice and Compete views', async ({ page }) => {
    const competeTab = page.locator('#tab-compete');
    await competeTab.click();

    await expect(page.locator('#section-practice')).toHaveClass(/hidden/);
    await expect(page.locator('#section-compete')).not.toHaveClass(/hidden/);
  });
});