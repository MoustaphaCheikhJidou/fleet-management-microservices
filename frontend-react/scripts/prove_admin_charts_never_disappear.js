const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:8081';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'superadmin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe_Admin!123';

const DAILY_CANVAS = '[data-testid="admin-daily-canvas"]';
const TYPE_CANVAS = '[data-testid="admin-type-canvas"]';
const EMPTY_STATE = '[data-testid="admin-empty-state"]';
const KPI_SELECTOR = '.admin-metric';
const REFRESH_BUTTON = 'text=Actualiser les données';

const TMP_SCREENSHOT = '/tmp/admin-charts-never-disappear.png';
const TMP_JSON = '/tmp/admin-charts-never-disappear.json';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  const collectCanvasState = async () => {
    const locatorDaily = page.locator(DAILY_CANVAS);
    const locatorType = page.locator(TYPE_CANVAS);
    const [dailyBox, typeBox, dailyVisible, typeVisible] = await Promise.all([
      locatorDaily.boundingBox(),
      locatorType.boundingBox(),
      locatorDaily.isVisible().catch(() => false),
      locatorType.isVisible().catch(() => false),
    ]);

    return {
      daily: {
        present: Boolean(dailyBox),
        visible: dailyVisible,
        bbox: dailyBox,
        sizeOk: Boolean(dailyBox) && dailyBox.width > 50 && dailyBox.height > 50,
      },
      type: {
        present: Boolean(typeBox),
        visible: typeVisible,
        bbox: typeBox,
        sizeOk: Boolean(typeBox) && typeBox.width > 50 && typeBox.height > 50,
      },
    };
  };

  const collectPageState = async () => {
    const emptyStateVisible = await page.locator(EMPTY_STATE).first().isVisible().catch(() => false);
    const zeroRowsVisible = await page.locator('text=/0\s*rows/i').first().isVisible().catch(() => false);
    const aucunVisible = await page.locator('text=/Aucun/i').first().isVisible().catch(() => false);
    const computedEmptyState = emptyStateVisible || zeroRowsVisible || aucunVisible;
    const kpiCount = await page.locator(KPI_SELECTOR).count();
    const charts = await collectCanvasState();
    return { charts, emptyStateVisible: computedEmptyState, kpiCount, url: page.url() };
  };

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('[data-testid="login-email"]', ADMIN_EMAIL);
  await page.fill('[data-testid="login-password"]', ADMIN_PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 }).catch(async () => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
  });

  await page.waitForSelector(DAILY_CANVAS, { timeout: 15000 });
  await page.waitForSelector(TYPE_CANVAS, { timeout: 15000 });
  await page.waitForTimeout(500);

  const initialState = await collectPageState();

  const refreshButton = page.locator(REFRESH_BUTTON);
  if (await refreshButton.first().isVisible().catch(() => false)) {
    await refreshButton.first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForSelector(DAILY_CANVAS, { timeout: 15000 });
    await page.waitForSelector(TYPE_CANVAS, { timeout: 15000 });
    await page.waitForTimeout(500);
  } else {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector(DAILY_CANVAS, { timeout: 15000 });
    await page.waitForSelector(TYPE_CANVAS, { timeout: 15000 });
    await page.waitForTimeout(500);
  }

  const afterRefreshState = await collectPageState();

  await page.screenshot({ path: TMP_SCREENSHOT, fullPage: true });

  const result = {
    url: page.url(),
    loginOk: page.url().includes('/admin'),
    dailyCanvas: {
      present: initialState.charts.daily.present,
      visible: initialState.charts.daily.visible,
      bbox: initialState.charts.daily.bbox,
      sizeOk: initialState.charts.daily.sizeOk,
    },
    typeCanvas: {
      present: initialState.charts.type.present,
      visible: initialState.charts.type.visible,
      bbox: initialState.charts.type.bbox,
      sizeOk: initialState.charts.type.sizeOk,
    },
    afterRefresh: {
      dailyCanvas: {
        present: afterRefreshState.charts.daily.present,
        visible: afterRefreshState.charts.daily.visible,
        bbox: afterRefreshState.charts.daily.bbox,
        sizeOk: afterRefreshState.charts.daily.sizeOk,
      },
      typeCanvas: {
        present: afterRefreshState.charts.type.present,
        visible: afterRefreshState.charts.type.visible,
        bbox: afterRefreshState.charts.type.bbox,
        sizeOk: afterRefreshState.charts.type.sizeOk,
      },
      emptyStateVisible: afterRefreshState.emptyStateVisible,
      kpiCount: afterRefreshState.kpiCount,
    },
    emptyStateVisible: initialState.emptyStateVisible,
    kpiCount: initialState.kpiCount,
    consoleErrorsCount: consoleErrors.length,
    pageErrorsCount: pageErrors.length,
    consoleErrors,
    pageErrors,
  };

  fs.writeFileSync(TMP_JSON, JSON.stringify(result, null, 2));

  const proofsDir = path.join(__dirname, '..', 'proofs');
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.copyFileSync(TMP_JSON, path.join(proofsDir, path.basename(TMP_JSON)));
  fs.copyFileSync(TMP_SCREENSHOT, path.join(proofsDir, path.basename(TMP_SCREENSHOT)));

  await browser.close();
  console.log('Proof saved', { json: TMP_JSON, screenshot: TMP_SCREENSHOT, result });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
