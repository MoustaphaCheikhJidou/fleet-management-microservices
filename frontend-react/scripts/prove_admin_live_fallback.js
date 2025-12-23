const fs = require('fs');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'superadmin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe_Admin!123';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Cas 1 : sans token, doit être redirigé vers /login
  await page.goto('http://localhost:8082/admin', { waitUntil: 'networkidle' });
  const unauthUrl = page.url();
  const redirectedToLogin = unauthUrl.includes('/login');

  // Cas 2 : avec token admin, chargement cockpit (live-first, fallback démo)
  let authPayload = { token: null, email: ADMIN_EMAIL, roles: ['ROLE_ADMIN'] };
  try {
    const res = await page.request.post('http://localhost:8082/api/v1/auth/signin', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const json = await res.json();
    authPayload = { token: json.token, email: json.email, roles: json.roles || ['ROLE_ADMIN'] };
  } catch (error) {
    console.warn('Impossible de récupérer le token admin, on teste le fallback démo.', error);
  }

  await page.goto('http://localhost:8082/login', { waitUntil: 'networkidle' });
  await page.evaluate((payload) => {
    window.localStorage.setItem('fleet-react-session', JSON.stringify(payload));
  }, authPayload);

  await page.goto('http://localhost:8082/admin', { waitUntil: 'networkidle' });
  await page.waitForSelector('.admin-topbar', { timeout: 8000 });
  await page.waitForTimeout(800);

  const statusNote = await page.$eval('.admin-topbar__session .field-note', (el) => el.textContent.trim());
  const source = statusNote.includes('Données en direct') ? 'live' : 'mock';

  await page.screenshot({ path: '/tmp/admin-live-proof.png', fullPage: true });

  const output = {
    redirectedToLogin,
    unauthUrl,
    authUrl: page.url(),
    statusNote,
    source,
    screenshot: '/tmp/admin-live-proof.png',
  };

  fs.writeFileSync('/tmp/admin-live-proof.json', JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));

  await browser.close();
})();
