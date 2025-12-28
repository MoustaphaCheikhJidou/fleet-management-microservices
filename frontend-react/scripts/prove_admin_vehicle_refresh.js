// Playwright proof: add vehicle, check table and KPI refresh, exit 0 on success
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let consoleErrors = 0, pageErrors = 0;
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors++; });
  page.on('pageerror', () => { pageErrors++; });
  try {
    await page.goto('http://localhost:3000/login');
    await page.fill('[data-testid="login-email"]', 'admin_test_01@example.com');
    await page.fill('[data-testid="login-password"]', 'ChangeMe_123!');
    await page.click('[data-testid="login-submit"]');
    await page.waitForSelector('.admin-layout');
    await page.click('text="Véhicules"');
    const beforeCount = await page.$$eval('[data-testid="vehicle-row"]', rows => rows.length);
    await page.fill('[data-testid="vehicle-plate"]', 'NKC-1234');
    await page.fill('[data-testid="vehicle-brand"]', 'Toyota');
    await page.fill('[data-testid="vehicle-model"]', 'Corolla');
    await page.selectOption('[data-testid="vehicle-manager"]', { index: 1 });
    await page.click('[data-testid="vehicle-submit"]');
    await page.waitForTimeout(1000);
    const afterCount = await page.$$eval('[data-testid="vehicle-row"]', rows => rows.length);
    if (afterCount <= beforeCount) throw new Error('Vehicle table did not refresh');
    await page.screenshot({ path: '../proofs/prove_admin_vehicle_refresh.png' });
    const kpiText = await page.textContent('.admin-metric');
    if (!kpiText.match(/Véhicule[s]?:?\s*[1-9]/)) throw new Error('KPI not updated');
    fs.writeFileSync('../proofs/prove_admin_vehicle_refresh.json', JSON.stringify({ success: true, beforeCount, afterCount, consoleErrors, pageErrors }));
    if (consoleErrors > 0 || pageErrors > 0) throw new Error('Console or page errors detected');
    await browser.close();
    process.exit(0);
  } catch (e) {
    fs.writeFileSync('../proofs/prove_admin_vehicle_refresh.json', JSON.stringify({ success: false, error: e.message, consoleErrors, pageErrors }));
    await browser.close();
    process.exit(1);
  }
})();
