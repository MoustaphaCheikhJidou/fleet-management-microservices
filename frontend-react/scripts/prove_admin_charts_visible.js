const fs = require('fs');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

const SEED = 1700000000073;
const SESSION_KEY = 'fleet-react-session';
const ADMIN_SESSION = {
  token: 'dev-admin-token',
  email: 'superadmin@example.com',
  roles: ['ROLE_ADMIN'],
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  // Fix seed deterministe + reset storage + inject session pour accès admin
  await page.addInitScript(
    ({ seed, sessionKey, sessionValue }) => {
      localStorage.clear();
      sessionStorage.clear();
      Date.now = () => seed;
      localStorage.setItem(sessionKey, sessionValue);
    },
    { seed: SEED, sessionKey: SESSION_KEY, sessionValue: JSON.stringify(ADMIN_SESSION) }
  );

  await page.goto('http://localhost:8081/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    const bars = Array.from(document.querySelectorAll('.chart__item'));
    const charts = Array.from(document.querySelectorAll('.chart'));
    const firstBar = bars[0];

    const styleInfo = (el) => {
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        width: r.width,
        height: r.height,
        background: cs.backgroundColor,
      };
    };

    return {
      url: location.href,
      chartsCount: charts.length,
      barsCount: bars.length,
      firstBarStyle: styleInfo(firstBar),
      chartStyle: styleInfo(charts[0]),
      hasChartSection: Boolean(document.querySelector('.charts') || document.querySelector('.chart')),
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      anyPageBanner: document.querySelector('.admin-topbar__session .field-note')?.textContent?.trim() || null,
    };
  });

  await page.screenshot({ path: '/tmp/admin-charts-visible.png', fullPage: true });
  fs.writeFileSync('/tmp/admin-charts-visible.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();
