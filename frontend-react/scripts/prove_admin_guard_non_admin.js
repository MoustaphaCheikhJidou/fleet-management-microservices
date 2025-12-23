const fs = require('fs');
const path = require('path');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

const SESSION_KEY = 'fleet-react-session';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const baseUrl = 'http://localhost:8081';

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        token: 'fake-non-admin-token',
        email: 'user@example.com',
        roles: ['ROLE_DRIVER'],
      })
    );
  }, SESSION_KEY);

  await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 8000 });
  await page.waitForSelector('.notice-card', { timeout: 8000 });

  const bannerText = await page.$eval('.notice-card', (el) => el.textContent.trim());

  await page.screenshot({ path: '/tmp/admin-guard-non-admin.png', fullPage: true });

  const output = {
    redirectedToDashboard: page.url().includes('/dashboard'),
    url: page.url(),
    bannerText,
    sessionKey: SESSION_KEY,
    session: await page.evaluate((key) => window.localStorage.getItem(key), SESSION_KEY),
    screenshot: '/tmp/admin-guard-non-admin.png',
  };

  fs.writeFileSync('/tmp/admin-guard-non-admin.json', JSON.stringify(output, null, 2));

  const proofsDir = path.resolve(__dirname, '../proofs');
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.copyFileSync('/tmp/admin-guard-non-admin.json', path.join(proofsDir, 'admin-guard-non-admin.json'));
  fs.copyFileSync('/tmp/admin-guard-non-admin.png', path.join(proofsDir, 'admin-guard-non-admin.png'));

  console.log(JSON.stringify(output, null, 2));
  await browser.close();
})();
