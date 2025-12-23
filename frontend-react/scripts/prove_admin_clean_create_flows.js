const fs = require('fs');
const path = require('path');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

const SESSION_KEY = 'fleet-react-session';
const ADMIN_SESSION = {
  token: 'demo-token',
  email: 'superadmin@example.com',
  roles: ['ROLE_ADMIN'],
};
const PROOF_PNG = '/tmp/admin-clean-create-proof.png';
const PROOF_JSON = '/tmp/admin-clean-create-proof.json';
const PROOFS_DIR = path.join(process.cwd(), 'frontend-react', 'proofs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(20000);

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.addInitScript(({ sessionKey, sessionValue }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(sessionKey, sessionValue);
    localStorage.setItem('fleet_demo', '0');
    localStorage.removeItem('fleet_admin_seed');
    localStorage.removeItem('fleet_admin_local');
    localStorage.removeItem('admin_local_dataset');
  }, { sessionKey: SESSION_KEY, sessionValue: JSON.stringify(ADMIN_SESSION) });

  await page.goto('http://localhost:8081/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="admin-daily-canvas"]');
  await page.waitForFunction(() => window.__adminCharts?.daily && window.__adminCharts?.type);

  const emptyStateVisible = await page.isVisible('[data-testid="admin-empty-state"]');
  const blockerVisible = await page.isVisible('[data-testid="driver-create-blocker"]');

  const chartsBefore = await page.evaluate(() => {
    const daily = window.__adminCharts?.daily?.data?.datasets?.[0]?.data?.length || 0;
    const type = window.__adminCharts?.type?.data?.datasets?.[0]?.data?.length || 0;
    const canvasOk = Boolean(document.querySelector('[data-testid="admin-daily-canvas"]'));
    return { daily, type, canvasOk };
  });

  const carriersRowsBefore = await page.locator('[data-testid="carrier-row"]').count();
  const driversRowsBefore = await page.locator('[data-testid="driver-row"]').count();

  await page.waitForSelector('#carrier-form form');
  await page.locator('[data-testid="carrier-name"]').scrollIntoViewIfNeeded();
  await page.locator('[data-testid="carrier-name"]').fill('Exploitant Test');
  await page.locator('[data-testid="carrier-city"]').fill('Lyon');
  await page.locator('[data-testid="carrier-email"]').fill('contact@test.fr');
  await page.locator('[data-testid="carrier-fleetSize"]').fill('12');
  await page.locator('[data-testid="carrier-submit"]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="carrier-row"]').length === 1);

  const carriersRowsAfter = await page.locator('[data-testid="carrier-row"]').count();
  await page.waitForSelector('[data-testid="driver-create-blocker"]', { state: 'hidden' });

  await page.waitForSelector('#driver-form form');
  await page.locator('[data-testid="driver-name"]').scrollIntoViewIfNeeded();
  await page.locator('[data-testid="driver-name"]').fill('Jean Test');
  await page.locator('[data-testid="driver-carrier"]').selectOption({ label: 'Exploitant Test' });
  await page.locator('[data-testid="driver-email"]').fill('jean.test@example.com');
  await page.locator('[data-testid="driver-phone"]').fill('0612345678');
  await page.locator('[data-testid="driver-vehicle"]').fill('VHC-001');
  await page.locator('[data-testid="driver-status"]').selectOption({ label: 'Actif' });
  await page.locator('[data-testid="driver-submit"]').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="driver-row"]').length === 1);

  const driversRowsAfter = await page.locator('[data-testid="driver-row"]').count();
  const blockerVisibleAfter = await page.isVisible('[data-testid="driver-create-blocker"]');

  const kpis = await page.$$eval('.admin-metric h3', (nodes) => nodes.map((n) => parseInt(n.textContent || '0', 10) || 0));
  const chartsAfter = await page.evaluate(() => {
    const daily = window.__adminCharts?.daily?.data?.datasets?.[0]?.data?.length || 0;
    const type = window.__adminCharts?.type?.data?.datasets?.[0]?.data?.length || 0;
    const seed = localStorage.getItem('fleet_admin_seed');
    let seedState = {};
    try {
      seedState = seed ? JSON.parse(seed) : {};
    } catch (e) {
      seedState = {};
    }
    return {
      daily,
      type,
      seedCarriers: (seedState.carriers || []).length,
      seedDrivers: (seedState.drivers || []).length,
      seedAlerts: (seedState.alerts || []).length,
    };
  });

  const canvasVisible = await page.$eval('[data-testid="admin-daily-canvas"]', (el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  const result = {
    url: page.url(),
    chartsBefore,
    chartsAfter,
    canvasVisible,
    carriersRowsBefore,
    carriersRowsAfter,
    driversRowsBefore,
    driversRowsAfter,
    blockerVisibleAfter,
    kpis,
    emptyStateVisible,
    blockerVisible,
    consoleErrorsCount: consoleErrors.length,
    consoleErrors: consoleErrors.slice(0, 5),
    pageErrorsCount: pageErrors.length,
    pageErrors: pageErrors.slice(0, 5),
  };

  await page.screenshot({ path: PROOF_PNG, fullPage: true });
  fs.writeFileSync(PROOF_JSON, JSON.stringify(result, null, 2));
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
  fs.copyFileSync(PROOF_PNG, path.join(PROOFS_DIR, 'admin-clean-create-proof.png'));
  fs.copyFileSync(PROOF_JSON, path.join(PROOFS_DIR, 'admin-clean-create-proof.json'));
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();
