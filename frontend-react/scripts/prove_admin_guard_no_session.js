const fs = require('fs');
const path = require('path');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const baseUrl = 'http://localhost:8081';

  await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.location.pathname.includes('/login'), { timeout: 8000 });
  await page.waitForSelector('form.auth-form', { timeout: 8000 });

  await page.screenshot({ path: '/tmp/admin-guard-no-session.png', fullPage: true });

  const output = {
    redirectedToLogin: page.url().includes('/login'),
    url: page.url(),
    screenshot: '/tmp/admin-guard-no-session.png',
  };

  fs.writeFileSync('/tmp/admin-guard-no-session.json', JSON.stringify(output, null, 2));

  const proofsDir = path.resolve(__dirname, '../proofs');
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.copyFileSync('/tmp/admin-guard-no-session.json', path.join(proofsDir, 'admin-guard-no-session.json'));
  fs.copyFileSync('/tmp/admin-guard-no-session.png', path.join(proofsDir, 'admin-guard-no-session.png'));

  console.log(JSON.stringify(output, null, 2));
  await browser.close();
})();
