#!/usr/bin/env node
/* eslint-disable no-console */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:8081';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  const homeSignupCount = await page.locator('text=Créer un compte').count();
  const homeSignupLinkCount = await page.locator('a[href="/signup"]').count();

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  const loginSignupCount = await page.locator('text=Créer un compte').count();

  await page.goto(`${BASE_URL}/signup`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/login/);
  const bannerMessage = await page.locator('[data-testid="guard-banner"]').first().textContent({ timeout: 2000 }).catch(() => '');

  const screenshotPath = '/tmp/prove_no_signup_visible.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const result = {
    ok: homeSignupCount === 0 && homeSignupLinkCount === 0 && loginSignupCount === 0 && bannerMessage.includes('Création de compte'),
    counts: { homeSignupCount, homeSignupLinkCount, loginSignupCount },
    banner: bannerMessage.trim(),
    consoleErrors,
  };

  const jsonPath = '/tmp/prove_no_signup_visible.json';
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  const proofsDir = path.join(__dirname, '..', 'proofs');
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.copyFileSync(jsonPath, path.join(proofsDir, path.basename(jsonPath)));
  fs.copyFileSync(screenshotPath, path.join(proofsDir, path.basename(screenshotPath)));

  await browser.close();
  console.log('Proof saved', { jsonPath, screenshotPath, result });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
