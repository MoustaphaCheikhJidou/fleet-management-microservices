// Playwright proof: create admin with password, login as new admin, check banner, exit 0 on success
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
    await page.fill('[data-testid="login-email"]', 'superadmin@example.com');
    await page.fill('[data-testid="login-password"]', 'ChangeMe_123!');
    await page.click('[data-testid="login-submit"]');
    await page.waitForSelector('.admin-layout');
    await page.click('text="Administrateurs"');
    await page.fill('[data-testid="admin-name"]', 'Admin Test 01');
    await page.fill('[data-testid="admin-email"]', 'admin_test_01@example.com');
    await page.fill('[data-testid="admin-password"]', 'ChangeMe_123!');
    await page.fill('[data-testid="admin-confirmPassword"]', 'ChangeMe_123!');
    await page.click('[data-testid="admin-submit"]');
    await page.waitForSelector('.banner-success, .admin-metric');
    const banner = await page.textContent('.admin-main');
    if (!banner.includes('Compte créé: admin_test_01@example.com')) throw new Error('Success banner not found');
    await page.screenshot({ path: '../proofs/prove_admin_create_admin_with_password.png' });
    await page.click('button.ghost-button:has-text("Déconnexion")');
    await page.fill('[data-testid="login-email"]', 'admin_test_01@example.com');
    await page.fill('[data-testid="login-password"]', 'ChangeMe_123!');
    await page.click('[data-testid="login-submit"]');
    await page.waitForSelector('.admin-layout');
    await page.screenshot({ path: '../proofs/prove_admin_create_admin_with_password_loggedin.png' });
    fs.writeFileSync('../proofs/prove_admin_create_admin_with_password.json', JSON.stringify({ success: true, consoleErrors, pageErrors }));
    if (consoleErrors > 0 || pageErrors > 0) throw new Error('Console or page errors detected');
    await browser.close();
    process.exit(0);
  } catch (e) {
    fs.writeFileSync('../proofs/prove_admin_create_admin_with_password.json', JSON.stringify({ success: false, error: e.message, consoleErrors, pageErrors }));
    await browser.close();
    process.exit(1);
  }
})();
