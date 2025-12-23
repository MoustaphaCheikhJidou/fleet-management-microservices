const fs = require('fs');
const path = require('path');
const { chromium, request } = require('/tmp/playwright/node_modules/playwright');

const SESSION_KEY = 'fleet-react-session';
const baseUrl = 'http://localhost:8081';
const proofsDir = path.resolve(__dirname, '../proofs');

const account = {
  email: 'jiddou@gmail.com',
  password: 'Ma@22117035',
  roles: ['ROLE_DRIVER'],
};

function bail(message, detail) {
  console.error(JSON.stringify({ error: message, detail }, null, 2));
  process.exit(1);
}

async function signupIfNeeded(api, payload) {
  const endpoints = ['/api/v1/auth/signup', '/api/v1/auth/register'];
  for (const endpoint of endpoints) {
    try {
      const res = await api.post(endpoint, { data: payload });
      if (res.ok() || res.status() === 409) return true;
    } catch (error) {
      // ignore and try next
    }
  }
  return false;
}

async function signin(api, payload) {
  const res = await api.post('/api/v1/auth/signin', { data: payload });
  if (!res.ok()) {
    const body = await res.text();
    const err = new Error(`signin failed (${res.status()})`);
    err.status = res.status();
    err.body = body;
    throw err;
  }
  return res.json();
}

async function ensureAccount(api) {
  try {
    return await signin(api, { email: account.email, password: account.password });
  } catch (error) {
    if (![401, 403, 404].includes(error.status)) throw error;
    const created = await signupIfNeeded(api, account);
    if (!created) bail('compte absent / endpoint signup non dispo', { status: error.status, body: error.body });
    return await signin(api, { email: account.email, password: account.password });
  }
}

async function navigateDashboard(page, headerText) {
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
  const headerOk = await page.locator(`text=${headerText}`).first().isVisible().catch(() => false);
  if (!headerOk) {
    await page.goto(`${baseUrl}/#/dashboard`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForSelector(`text=${headerText}`, { timeout: 15000 });
}

async function run() {
  const api = await request.newContext({ baseURL: baseUrl });
  const auth = await ensureAccount(api);
  const session = {
    token: auth.token,
    email: auth.email || account.email,
    roles: auth.roles && auth.roles.length ? auth.roles : account.roles,
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: baseUrl });
  context.addInitScript((data) => {
    window.localStorage.setItem(data.key, JSON.stringify(data.session));
    window.sessionStorage.setItem('forceMock', 'true');
  }, { key: SESSION_KEY, session });

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, body: '' }));
  await page.route('https://fonts.gstatic.com/**', (route) => route.fulfill({ status: 200, body: '' }));
  await page.route('**/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  await navigateDashboard(page, 'Espace Conducteur');
  await page.waitForSelector('#section-payments table', { timeout: 12000 });

  const bodyText = await page.textContent('body');
  const currencyMatch = bodyText.match(/MAD|DH/);
  const billingRows = await page.$$eval('#section-payments tbody tr', (els) => els.length);
  const output = {
    url: page.url(),
    titlePresent: await page.locator('text=Espace Conducteur').first().isVisible().catch(() => false),
    roleHeaderOk: await page.locator('text=Espace Conducteur').first().isVisible().catch(() => false),
    billingSectionOk: billingRows > 0,
    currencyOk: Boolean(currencyMatch),
    currencySample: currencyMatch ? currencyMatch[0] : '',
    kpiCount: await page.$$eval('.kpi-card', (els) => els.length),
    tableCount: await page.$$eval('table', (els) => els.length),
    panelCount: await page.$$eval('section.panel', (els) => els.length),
    paymentRows: billingRows,
    consoleErrorsCount: consoleErrors.length,
    pageErrorsCount: pageErrors.length,
    consoleErrors,
    pageErrors,
  };

  const screenshotTmp = '/tmp/driver-account-proof.png';
  const jsonTmp = '/tmp/driver-account-proof.json';
  await page.screenshot({ path: screenshotTmp, fullPage: true });
  fs.writeFileSync(jsonTmp, JSON.stringify(output, null, 2));
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.copyFileSync(jsonTmp, path.join(proofsDir, 'driver-account-proof.json'));
  fs.copyFileSync(screenshotTmp, path.join(proofsDir, 'driver-account-proof.png'));

  await api.dispose();
  await browser.close();

  if (output.roleHeaderOk && output.billingSectionOk && output.currencyOk && output.consoleErrorsCount === 0 && output.pageErrorsCount === 0) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
  }

  bail('Preuve conducteur invalide', output);
}

run().catch((error) => bail('Erreur inattendue', { message: error.message, stack: error.stack }));
