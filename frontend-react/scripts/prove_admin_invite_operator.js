#!/usr/bin/env node
/* eslint-disable no-console */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { waitForMail } = require('./_mailhog');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:8081';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'superadmin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe_Admin!123';

const INVITE_FULLNAME = 'EL Moustapha JIDDOU';
const INVITE_CITY = 'Nouakchott';
const INVITE_EMAIL = process.env.INVITE_EMAIL || 'elmoustapha.cheikh.jiddou@gmail.com';
const INVITE_FLEET_SIZE = '1';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('[data-testid="login-email"]', ADMIN_EMAIL);
  await page.fill('[data-testid="login-password"]', ADMIN_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(/\/admin/);

  await page.waitForSelector('[data-testid="admin-daily-canvas"]');
  await page.waitForSelector('[data-testid="admin-type-canvas"]');

  await page.fill('[data-testid="carrier-name"]', INVITE_FULLNAME);
  await page.fill('[data-testid="carrier-city"]', INVITE_CITY);
  await page.fill('[data-testid="carrier-email"]', INVITE_EMAIL);
  await page.fill('[data-testid="carrier-fleetSize"]', INVITE_FLEET_SIZE);

  const responsePromise = page.waitForResponse((res) => res.url().includes('/api/v1/admin/users') && res.request().method() === 'POST');
  await page.click('[data-testid="carrier-submit"]');
  const inviteResponse = await responsePromise.catch(() => null);
  const httpStatus = inviteResponse?.status?.() || null;

  const actionMessage = await page.locator('[data-testid="admin-invite-banner"]').first().textContent({ timeout: 8000 }).catch(() => '');

  const mail = await waitForMail({ to: INVITE_EMAIL, subjectSubstring: 'Invitation' });
  const resetUrl = mail.resetUrl || '';
  const sanitizedResetUrl = resetUrl.replace(/token=[A-Za-z0-9._~-]+/i, 'token=***');

  const screenshotPath = '/tmp/prove_admin_invite_operator.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const result = {
    ok: Boolean(resetUrl) && httpStatus && httpStatus < 300 && actionMessage.toLowerCase().includes('invitation envoyée'),
    httpStatus,
    inviteEmail: INVITE_EMAIL,
    actionMessage: actionMessage.trim(),
    resetUrl: sanitizedResetUrl,
    mailFound: Boolean(resetUrl),
    consoleErrors,
    consoleErrorsCount: consoleErrors.length,
    pageErrors,
    pageErrorsCount: pageErrors.length,
  };

  const jsonPath = '/tmp/prove_admin_invite_operator.json';
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  fs.writeFileSync('/tmp/operator_invite_email.txt', INVITE_EMAIL);
  fs.writeFileSync('/tmp/operator_reset_url.txt', resetUrl);

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
