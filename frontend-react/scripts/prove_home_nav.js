const fs = require('fs');
const path = require('path');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const baseUrl = 'http://localhost:8081';
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.home-hero__actions .primary-button', { timeout: 8000 });

  await page.click('.home-hero__actions .primary-button');
  await page.waitForFunction(() => window.location.pathname.includes('/login'), { timeout: 5000 });
  await page.waitForSelector('h2:has-text("Connexion")', { timeout: 5000 });
  const loginUrl = page.url();
  const loginHeading = await page.textContent('h2:has-text("Connexion")');

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.home-hero__actions .secondary-button', { timeout: 8000 });

  await page.click('.home-hero__actions .secondary-button');
  await page.waitForFunction(() => window.location.pathname.includes('/signup'), { timeout: 5000 });
  await page.waitForSelector('h2:has-text("Inscription")', { timeout: 5000 });
  const signupUrl = page.url();
  const signupHeading = await page.textContent('h2:has-text("Inscription")');

  await page.screenshot({ path: '/tmp/home-nav-proof.png', fullPage: true });

  const output = {
    loginUrl,
    loginHeading,
    signupUrl,
    signupHeading,
    screenshot: '/tmp/home-nav-proof.png',
  };

  fs.writeFileSync('/tmp/home-nav-proof.json', JSON.stringify(output, null, 2));

  const proofsDir = path.resolve(__dirname, '../proofs');
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.copyFileSync('/tmp/home-nav-proof.json', path.join(proofsDir, 'home-nav-proof.json'));
  fs.copyFileSync('/tmp/home-nav-proof.png', path.join(proofsDir, 'home-nav-proof.png'));

  console.log(JSON.stringify(output, null, 2));
  await browser.close();
})();
