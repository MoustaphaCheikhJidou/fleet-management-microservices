const fs = require('fs');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const res = await page.request.get('http://localhost:8082/src/styles/app.css');
  const cssHttpStatus = res.status();
  const cssContentType = res.headers()['content-type'] || '';

  await page.goto('http://localhost:8082/admin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const proof = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);

    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        selector: sel,
        bgColor: cs.backgroundColor,
        bgImage: cs.backgroundImage,
        color: cs.color,
        font: cs.fontFamily,
      };
    };

    const shell =
      pick('.admin-shell') ||
      pick('.dashboard-shell') ||
      pick('.app-shell') ||
      pick('main') ||
      pick('body');

    return {
      mutedTextVar: root.getPropertyValue('--muted-text').trim(),
      bodyBgColor: body.backgroundColor,
      bodyBgImage: body.backgroundImage,
      bodyColor: body.color,
      bodyFont: body.fontFamily,
      shell,
    };
  });

  await page.screenshot({ path: '/tmp/admin-styles-proof.png', fullPage: true });
  const out = { cssHttpStatus, cssContentType, proof, url: page.url(), screenshot: '/tmp/admin-styles-proof.png' };

  fs.writeFileSync('/tmp/admin-styles-proof.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));

  await browser.close();
})();
