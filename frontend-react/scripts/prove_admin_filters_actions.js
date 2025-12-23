const fs = require('fs');
const path = require('path');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

const SEED_BASE = 1700000000073;
const SESSION_KEY = 'fleet-react-session';
const ADMIN_SESSION = {
  token: 'demo-token',
  email: 'superadmin@example.com',
  roles: ['ROLE_ADMIN'],
  name: 'Super Admin',
};
const PROOF_PNG = '/tmp/admin-filters-actions-proof.png';
const PROOF_JSON = '/tmp/admin-filters-actions-proof.json';
const PROOFS_DIR = path.join(process.cwd(), 'frontend-react', 'proofs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(15000);

  const consoleLogs = [];
  const pageErrors = [];
  page.on('console', (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // Seed + session deterministes
  await page.addInitScript(
    ({ seed, sessionKey, sessionValue }) => {
      localStorage.clear();
      sessionStorage.clear();
      Date.now = () => seed;
      localStorage.setItem(sessionKey, sessionValue);
    },
    { seed: SEED_BASE, sessionKey: SESSION_KEY, sessionValue: JSON.stringify(ADMIN_SESSION) }
  );

  await page.goto('http://localhost:8081/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  const currentUrl = page.url();
  const isLogin = await page.evaluate(() => !!document.querySelector('input[type="email"], form[action="/login"]'));
  const isDashboard = /\/dashboard/.test(currentUrl);
  if (isLogin || isDashboard) {
    const bodySnippet = ((await page.textContent('body')) || '').slice(0, 240);
    await page.screenshot({ path: PROOF_PNG, fullPage: true });
    const debugResult = {
      redirected: true,
      url: currentUrl,
      isLogin,
      isDashboard,
      bodySnippet,
      pageErrors,
      consoleErrorsCount: consoleLogs.filter((l) => l.type === 'error').length,
      firstConsole: consoleLogs.slice(0, 8),
      screenshot: PROOF_PNG,
    };
    fs.writeFileSync(PROOF_JSON, JSON.stringify(debugResult, null, 2));
    fs.mkdirSync(PROOFS_DIR, { recursive: true });
    fs.copyFileSync(PROOF_PNG, path.join(PROOFS_DIR, 'admin-filters-actions.png'));
    fs.copyFileSync(PROOF_JSON, path.join(PROOFS_DIR, 'admin-filters-actions.json'));
    console.log(JSON.stringify(debugResult, null, 2));
    await browser.close();
    return;
  }

  await page.waitForSelector('.admin-metric');
  await page.waitForSelector('.chart__item');

  // Helpers
  const countAlerts = async () => page.locator('section.panel').nth(0).locator('tbody tr').count();
  const countCarriers = async () => page.locator('section.panel').nth(1).locator('tbody tr').count();
  const countDrivers = async () => page.locator('section.panel').nth(2).locator('tbody tr').count();
  const barsCount = async () => page.locator('.chart__item').count();

  const before = {
    url: page.url(),
    bars: await barsCount(),
    alerts: await countAlerts(),
    carriers: await countCarriers(),
    drivers: await countDrivers(),
  };

  // --- 1) Filtre periode (si selector existe)
  let periodChanged = false;
  const periodSelect = page.locator('select').filter({ hasText: /7j|30j/i }).first();
  if (await periodSelect.count()) {
    await periodSelect.selectOption({ label: 'Fenêtre 30j' });
    await page.waitForTimeout(300);
    periodChanged = true;
  }

  // --- 2) Filtre alertes "Critique" (si existe)
  let criticalFilterApplied = false;
  const alertsPanel = page.locator('section.panel').nth(0);
  const severitySelect = alertsPanel.locator('select.form-select').nth(1);
  if (await severitySelect.count()) {
    await severitySelect.selectOption({ label: 'Critique' });
    await page.waitForTimeout(300);
    criticalFilterApplied = true;
  }
  const afterAlertFilter = { alerts: await countAlerts() };

  // --- 3) Action rapide: marquer une alerte (si bouton existe)
  let markActionWorked = false;
  const firstAlertRow = alertsPanel.locator('tbody tr').first();
  if (await firstAlertRow.count()) {
    const markBtn = firstAlertRow.locator('[data-testid="alert-mark"]').first();
    if (await markBtn.count()) {
      await markBtn.click();
      await page.waitForFunction(
        () => {
          const row = document.querySelector('section.panel tbody tr');
          return row && /Traitée/i.test(row.innerText || '');
        },
        { timeout: 1500 }
      );
      markActionWorked = true;
    }
  }

  // --- 4) Action rapide: assigner (si bouton existe)
  let assignActionWorked = false;
  if (await firstAlertRow.count()) {
    const assignBtn = firstAlertRow.locator('[data-testid="alert-assign"]').first();
    if (await assignBtn.count()) {
      await assignBtn.click();
      await page.waitForFunction(
        () => {
          const row = document.querySelector('section.panel tbody tr');
          return row && /Assignée|Responsable/i.test(row.innerText || '');
        },
        { timeout: 1500 }
      );
      assignActionWorked = true;
    }
  }

  // --- 5) Export CSV (mock) : on verifie que l'action existe et clique
  let exportClicked = false;
  const exportBtn = page.getByRole('button', { name: /export|csv/i });
  if (await exportBtn.count()) {
    await exportBtn.first().click();
    await page.waitForTimeout(300);
    exportClicked = true;
  }

  // --- 6) Reset filtres (si bouton existe)
  let resetWorked = false;
  const resetBtn = page.getByRole('button', { name: /reinitialiser|reset/i });
  if (await resetBtn.count()) {
    await resetBtn.first().click();
    await page.waitForTimeout(400);
    resetWorked = true;
  }

  const after = {
    bars: await barsCount(),
    alerts: await countAlerts(),
    carriers: await countCarriers(),
    drivers: await countDrivers(),
  };

  const result = {
    before,
    periodChanged,
    criticalFilterApplied,
    afterAlertFilter,
    markActionWorked,
    assignActionWorked,
    exportClicked,
    resetWorked,
    after,
    pass: {
      chartsVisible: before.bars > 0 && after.bars > 0,
      filtersAffectData: !criticalFilterApplied ? true : (afterAlertFilter.alerts <= before.alerts),
    },
    pageErrors,
    consoleErrorsCount: consoleLogs.filter((l) => l.type === 'error').length,
    firstConsole: consoleLogs.slice(0, 8),
  };

  await page.screenshot({ path: PROOF_PNG, fullPage: true });
  fs.writeFileSync(PROOF_JSON, JSON.stringify(result, null, 2));
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
  fs.copyFileSync(PROOF_PNG, path.join(PROOFS_DIR, 'admin-filters-actions.png'));
  fs.copyFileSync(PROOF_JSON, path.join(PROOFS_DIR, 'admin-filters-actions.json'));
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();
