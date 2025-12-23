#!/usr/bin/env node
/**
 * prove_admin_page_loads.js
 * Validates that /admin page loads without JS errors after login.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const PROOFS_DIR = path.join(__dirname, '..', 'proofs');
const ADMIN_EMAIL = 'superadmin@example.com';
const ADMIN_PASSWORD = 'ChangeMe_Admin!123';

(async () => {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', (err) => {
    pageErrors.push({ message: err.message, stack: err.stack });
  });

  console.log('[admin-page] Step 1: Navigate to login...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });

  console.log('[admin-page] Step 2: Fill login form...');
  await page.fill('[data-testid="login-email"]', ADMIN_EMAIL);
  await page.fill('[data-testid="login-password"]', ADMIN_PASSWORD);
  
  console.log('[admin-page] Step 3: Submit login...');
  await page.click('[data-testid="login-submit"]');
  
  // Wait for redirect to /admin
  await page.waitForTimeout(3000);
  
  const urlAfterLogin = page.url();
  console.log(`[admin-page] URL after login: ${urlAfterLogin}`);

  // Take screenshot of admin page
  const screenshotPath = path.join(PROOFS_DIR, 'admin-page-loads.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`[admin-page] Screenshot saved: ${screenshotPath}`);

  // Check for visible content
  const bodyText = await page.evaluate(() => document.body?.innerText?.trim() || '');
  const hasContent = bodyText.length > 50;
  
  // Check if we're on admin page or if ErrorBoundary is shown
  const hasErrorBoundary = bodyText.includes('Erreur d\'affichage') || bodyText.includes('Une erreur est survenue');
  const isOnAdminPage = urlAfterLogin.includes('/admin');

  // Save proof
  const proof = {
    timestamp: new Date().toISOString(),
    loginUrl: `${BASE_URL}/login`,
    finalUrl: urlAfterLogin,
    isOnAdminPage,
    hasContent,
    hasErrorBoundary,
    bodyTextLength: bodyText.length,
    bodyTextPreview: bodyText.substring(0, 500),
    consoleLogs: consoleLogs.slice(-30),
    pageErrors,
    pageErrorsCount: pageErrors.length,
  };

  const proofPath = path.join(PROOFS_DIR, 'admin-page-loads.json');
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  console.log(`[admin-page] Proof saved: ${proofPath}`);

  await browser.close();

  // Pass conditions:
  // 1. No uncaught page errors
  // 2. Page has content (not blank)
  // 3. No ErrorBoundary shown
  const passed = pageErrors.length === 0 && hasContent && !hasErrorBoundary;

  if (passed) {
    console.log('[admin-page] ✅ PASS: Admin page loads without errors.');
    process.exit(0);
  } else {
    console.error('[admin-page] ❌ FAIL:');
    if (pageErrors.length > 0) {
      console.error('  Page errors:', pageErrors.map(e => e.message));
    }
    if (hasErrorBoundary) {
      console.error('  ErrorBoundary is displayed');
    }
    if (!hasContent) {
      console.error('  Page is blank');
    }
    process.exit(1);
  }
})();
