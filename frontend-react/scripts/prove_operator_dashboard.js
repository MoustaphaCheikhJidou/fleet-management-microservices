const fs = require('fs');
const path = require('path');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

const SESSION_KEY = 'fleet-react-session';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const baseUrl = 'http://localhost:8081';

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.evaluate((key) => {
    const seed = 1717171717;
    const originalNow = Date.now;
    Date.now = () => seed;
    window.localStorage.setItem(
      key,
      JSON.stringify({ token: 'carrier-demo', email: 'ops@example.com', roles: ['ROLE_CARRIER'] })
    );
    Date.now = originalNow;
  }, SESSION_KEY);

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Espace Exploitant', { timeout: 8000 });
  await page.waitForSelector('.kpi-card', { timeout: 8000 });

  const kpiCount = await page.$$eval('.kpi-card', (els) => els.length);
  const tableCount = await page.$$eval('table', (els) => els.length);
  const panelCount = await page.$$eval('section.panel', (els) => els.length);

  await page.screenshot({ path: '/tmp/operator-dashboard-proof.png', fullPage: true });

  const output = {
    url: page.url(),
    titlePresent: Boolean(await page.$('text=Espace Exploitant')),
    kpiCount,
    tableCount,
    panelCount,
    screenshot: '/tmp/operator-dashboard-proof.png',
  };

  fs.writeFileSync('/tmp/operator-dashboard-proof.json', JSON.stringify(output, null, 2));

  const proofsDir = path.resolve(__dirname, '../proofs');
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.copyFileSync('/tmp/operator-dashboard-proof.json', path.join(proofsDir, 'operator-dashboard-proof.json'));
  fs.copyFileSync('/tmp/operator-dashboard-proof.png', path.join(proofsDir, 'operator-dashboard-proof.png'));

  console.log(JSON.stringify(output, null, 2));
  await browser.close();
})();
