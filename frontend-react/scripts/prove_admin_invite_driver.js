#!/usr/bin/env node
/* eslint-disable no-console */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { waitForMail } = require('./_mailhog');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:8081';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@fleet.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'P@ssw0rd!';

function uniqueEmail() {
  const stamp = Date.now();
  return `driver+${stamp}@example.com`;
}

async function loginAsAdmin(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('[data-testid="login-email"]', ADMIN_EMAIL);
  await page.fill('[data-testid="login-password"]', ADMIN_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(/\/admin/);
  await page.waitForSelector('[data-testid="admin-daily-canvas"]');
}

async function ensureCarrierExists(page) {
  const carrierRows = await page.locator('[data-testid="carrier-row"]').count();
  if (carrierRows > 0) return;
  const tempEmail = uniqueEmail();
  await page.fill('[data-testid="carrier-name"]', 'Exploitant Conducteur');
  await page.fill('[data-testid="carrier-city"]', 'Rabat');
  await page.fill('[data-testid="carrier-email"]', tempEmail);
  await page.fill('[data-testid="carrier-fleetSize"]', '5');
  await page.click('[data-testid="carrier-submit"]');
  await page.waitForTimeout(500);
}

async function main() {
  const inviteEmail = uniqueEmail();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await loginAsAdmin(page);
  await ensureCarrierExists(page);

  const firstCarrierOption = page.locator('[data-testid="driver-carrier"] option').nth(1);
  const carrierName = (await firstCarrierOption.textContent()) || 'Exploitant Conducteur';
  await page.selectOption('[data-testid="driver-carrier"]', { label: carrierName });
  await page.fill('[data-testid="driver-name"]', 'Conducteur Test');
  await page.fill('[data-testid="driver-email"]', inviteEmail);
  await page.fill('[data-testid="driver-phone"]', '+212612345678');
  await page.fill('[data-testid="driver-vehicle"]', 'VAN-01');
  await page.click('[data-testid="driver-submit"]');

  const actionMessage = await page.locator('[data-testid="admin-action-message"]').first().textContent({ timeout: 8000 }).catch(() => '');

  const mail = await waitForMail({ to: inviteEmail, subjectSubstring: 'Invitation' });
  const resetUrl = mail.resetUrl || '';
  const sanitizedResetUrl = resetUrl.replace(/token=[A-Za-z0-9._~-]+/i, 'token=***');

  const screenshotPath = '/tmp/prove_admin_invite_driver.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const result = {
    ok: Boolean(resetUrl) && actionMessage.includes(inviteEmail),
    inviteEmail,
    actionMessage: actionMessage.trim(),
    resetUrl: sanitizedResetUrl,
    consoleErrors,
  };

  const jsonPath = '/tmp/prove_admin_invite_driver.json';
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  fs.writeFileSync('/tmp/driver_invite_email.txt', inviteEmail);
  fs.writeFileSync('/tmp/driver_reset_url.txt', resetUrl);

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
