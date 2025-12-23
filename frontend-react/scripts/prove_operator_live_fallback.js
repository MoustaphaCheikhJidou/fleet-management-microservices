const fs = require('fs');
const path = require('path');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

const SESSION_KEY = 'fleet-react-session';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const baseUrl = 'http://localhost:8081';
  const proofsDir = path.resolve(__dirname, '../proofs');

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((key) => {
    const seed = 20240601;
    const originalNow = Date.now;
    Date.now = () => seed;
    window.localStorage.setItem(
      key,
      JSON.stringify({ token: 'carrier-demo', email: 'ops@example.com', roles: ['ROLE_CARRIER'] })
    );
    Date.now = originalNow;
  }, SESSION_KEY);

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Espace Exploitant', { timeout: 8000 });
  await page.waitForSelector('.kpi-card', { timeout: 8000 });
  await page.waitForSelector('.sidebar-note', { timeout: 8000 });

  const statusText = await page.$eval('.sidebar-note', (el) => el.textContent || '');
  const statusLive = /temps réel|direct chargées|direct partielles/i.test(statusText);
  const statusDemo = /démonstration|simulation|indisponibles/i.test(statusText);

  const kpiCount = await page.$$eval('.kpi-card', (els) => els.length);
  const tableCount = await page.$$eval('table', (els) => els.length);
  const menuButtons = await page.$$eval('.dashboard-sidebar button', (els) => els.map((b) => b.textContent.trim()));

  await page.screenshot({ path: '/tmp/operator-live-fallback.png', fullPage: true });

  const output = {
    url: page.url(),
    titlePresent: Boolean(await page.$('text=Espace Exploitant')),
    statusText: statusText.trim(),
    statusLive,
    statusDemo,
    kpiCount,
    tableCount,
    menuButtons,
    screenshot: '/tmp/operator-live-fallback.png',
  };

  fs.writeFileSync('/tmp/operator-live-fallback.json', JSON.stringify(output, null, 2));
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.copyFileSync('/tmp/operator-live-fallback.json', path.join(proofsDir, 'prove_operator_live_fallback.json'));
  fs.copyFileSync('/tmp/operator-live-fallback.png', path.join(proofsDir, 'prove_operator_live_fallback.png'));

  console.log(JSON.stringify(output, null, 2));
  await browser.close();
})();
