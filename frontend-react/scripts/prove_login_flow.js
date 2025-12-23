const fs = require('fs');
const path = require('path');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'superadmin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe_Admin!123';
const SESSION_KEY = 'fleet-react-session';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const baseUrl = 'http://localhost:8081';

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.fill('#login-email', ADMIN_EMAIL);
  await page.fill('#login-password', ADMIN_PASSWORD);
  await page.click('button:has-text("Se connecter")');

  await page.waitForFunction(() => window.location.pathname.includes('/admin'), { timeout: 8000 });
  await page.waitForSelector('.admin-topbar', { timeout: 8000 });

  const sessionData = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    let parsed = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch (error) {
      parsed = { parseError: true, raw };
    }
    return { raw, parsed, hasToken: Boolean(parsed && parsed.token) };
  }, SESSION_KEY);

  await page.screenshot({ path: '/tmp/login-flow-proof.png', fullPage: true });

  const output = {
    url: page.url(),
    sessionKey: SESSION_KEY,
    session: sessionData,
    screenshot: '/tmp/login-flow-proof.png',
  };

  fs.writeFileSync('/tmp/login-flow-proof.json', JSON.stringify(output, null, 2));

  const proofsDir = path.resolve(__dirname, '../proofs');
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.copyFileSync('/tmp/login-flow-proof.json', path.join(proofsDir, 'login-flow-proof.json'));
  fs.copyFileSync('/tmp/login-flow-proof.png', path.join(proofsDir, 'login-flow-proof.png'));

  console.log(JSON.stringify(output, null, 2));
  await browser.close();
})();
