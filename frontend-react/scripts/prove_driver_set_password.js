#!/usr/bin/env node
/* eslint-disable no-console */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { waitForMail } = require('./_mailhog');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:8081';
const PASSWORD = process.env.DRIVER_PASSWORD || 'Driver#123';

function readFromTmp(file) {
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch (_) {
    return '';
  }
}

async function main() {
  const inviteEmail = process.env.DRIVER_EMAIL || readFromTmp('/tmp/driver_invite_email.txt');
  if (!inviteEmail) throw new Error('Missing driver invite email. Run prove_admin_invite_driver first.');

  const mail = await waitForMail({ to: inviteEmail, subjectSubstring: 'Invitation' });
  const resetUrl = mail.resetUrl || readFromTmp('/tmp/driver_reset_url.txt');
  if (!resetUrl) throw new Error('Reset URL not found in MailHog.');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(resetUrl, { waitUntil: 'networkidle' });
  await page.fill('[data-testid="reset-token"]', new URL(resetUrl).searchParams.get('token'));
  await page.fill('[data-testid="reset-new"]', PASSWORD);
  await page.fill('[data-testid="reset-confirm"]', PASSWORD);
  await page.click('[data-testid="reset-submit"]');
  await page.waitForURL(/\/login/);
  const guardText = await page.locator('[data-testid="guard-banner"]').first().textContent({ timeout: 4000 }).catch(() => '');

  await page.fill('[data-testid="login-email"]', inviteEmail);
  await page.fill('[data-testid="login-password"]', PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(/\/dashboard/);
  await page.waitForSelector('[data-testid="operator-dashboard"]');

  const screenshotPath = '/tmp/prove_driver_set_password.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const result = {
    ok: guardText.includes('Mot de passe enregistré'),
    inviteEmail,
    guardBanner: guardText.trim(),
    consoleErrors,
  };

  const jsonPath = '/tmp/prove_driver_set_password.json';
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
