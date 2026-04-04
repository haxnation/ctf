import { test, expect } from '@playwright/test';

test.describe('HaxNation CTF Platform Navigation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Playwright now knows the baseURL from the config
    await page.goto('/'); 
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