#!/usr/bin/env node
/**
 * prove_admin_route_loads.js
 * Validates /admin route loads without fatal errors (blank page check).
 * Captures console logs, page errors, and screenshots.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const PROOFS_DIR = path.join(__dirname, '..', 'proofs');

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

  console.log(`[admin-route] Navigating to ${BASE_URL}/admin ...`);

  try {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 15000 });
  } catch (navErr) {
    console.error('[admin-route] Navigation error:', navErr.message);
  }

  // Wait a bit for any async rendering / redirects
  await page.waitForTimeout(2000);

  const finalUrl = page.url();
  console.log(`[admin-route] Final URL: ${finalUrl}`);

  // Take screenshot
  const screenshotPath = path.join(PROOFS_DIR, 'admin-route-screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`[admin-route] Screenshot saved: ${screenshotPath}`);

  // Check for visible content (not blank)
  const bodyText = await page.evaluate(() => document.body?.innerText?.trim() || '');
  const hasContent = bodyText.length > 20;
  console.log(`[admin-route] Body text length: ${bodyText.length}`);

  // Check for error boundary message
  const hasErrorBoundary = bodyText.includes('Erreur') || bodyText.includes('erreur');

  // Check for redirect to login (expected when not authenticated)
  const redirectedToLogin = finalUrl.includes('/login');

  // Save proof artifact
  const proof = {
    timestamp: new Date().toISOString(),
    requestedUrl: `${BASE_URL}/admin`,
    finalUrl,
    redirectedToLogin,
    hasContent,
    hasErrorBoundary,
    bodyTextLength: bodyText.length,
    bodyTextPreview: bodyText.substring(0, 300),
    consoleLogs: consoleLogs.slice(-50),
    pageErrors,
    pageErrorsCount: pageErrors.length,
  };

  const proofPath = path.join(PROOFS_DIR, 'admin-route-loads.json');
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  console.log(`[admin-route] Proof saved: ${proofPath}`);

  await browser.close();

  // Determine pass/fail
  // Pass conditions:
  // 1. Redirected to /login (guard working) OR
  // 2. Page has content (not blank) AND no uncaught page errors
  const passed =
    (redirectedToLogin && pageErrors.length === 0) ||
    (hasContent && pageErrors.length === 0);

  if (passed) {
    console.log('[admin-route] ✅ PASS: /admin route handled correctly.');
    process.exit(0);
  } else {
    console.error('[admin-route] ❌ FAIL: Page blank or has errors.');
    console.error('  pageErrors:', pageErrors);
    console.error('  hasContent:', hasContent);
    console.error('  redirectedToLogin:', redirectedToLogin);
    process.exit(1);
  }
})();
