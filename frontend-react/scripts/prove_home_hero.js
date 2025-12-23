const fs = require('fs');
const path = require('path');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const baseUrl = 'http://localhost:8081';
  const proofsDir = path.resolve(__dirname, '../proofs');

  let consoleErrors = 0;
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors += 1;
  });

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.home-hero__image', { timeout: 8000 });

  const heroImageLoaded = await page.$eval('.home-hero__image', (img) => {
    return Boolean(img && img.naturalWidth > 0 && img.naturalHeight > 0);
  });

  const loginButton = page.getByRole('button', { name: 'Connexion' });
  await loginButton.click();
  await page.waitForURL(/\/login/, { timeout: 8000 });
  const ctaLoginOk = page.url().includes('/login');

  await page.goBack({ waitUntil: 'networkidle' });
  const signupButton = page.getByRole('button', { name: 'Créer un compte' });
  await signupButton.click();
  await page.waitForURL(/\/signup/, { timeout: 8000 });
  const ctaSignupOk = page.url().includes('/signup');

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.home-hero');
  await page.screenshot({ path: '/tmp/home-hero-proof.png', fullPage: true });

  const output = {
    url: page.url(),
    heroImageLoaded,
    ctaLoginOk,
    ctaSignupOk,
    consoleErrorsCount: consoleErrors,
    screenshot: '/tmp/home-hero-proof.png',
  };

  fs.writeFileSync('/tmp/home-hero-proof.json', JSON.stringify(output, null, 2));
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.copyFileSync('/tmp/home-hero-proof.json', path.join(proofsDir, 'home-hero-proof.json'));
  fs.copyFileSync('/tmp/home-hero-proof.png', path.join(proofsDir, 'home-hero-proof.png'));

  console.log(JSON.stringify(output, null, 2));
  await browser.close();
})();
