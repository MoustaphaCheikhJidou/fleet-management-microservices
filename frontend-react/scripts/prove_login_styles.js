const fs = require('fs');
const { chromium } = require('/tmp/playwright/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:8082/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('.auth-card', { timeout: 5000 });

  const proof = await page.evaluate(() => {
    const form = document.querySelector('.auth-form');
    const inputs = Array.from(document.querySelectorAll('.auth-form input'));
    const first = inputs[0];
    const firstStyles = first ? getComputedStyle(first) : null;

    return {
      url: window.location.href,
      formDisplay: form ? getComputedStyle(form).display : null,
      formFlexDirection: form ? getComputedStyle(form).flexDirection : null,
      inputCount: inputs.length,
      inputWidths: inputs.map((el) => ({ type: el.type, width: el.getBoundingClientRect().width })),
      firstInputBg: firstStyles ? firstStyles.backgroundColor : null,
      firstInputColor: firstStyles ? firstStyles.color : null,
      firstInputBorder: firstStyles ? firstStyles.border : null,
      firstInputWidth: first ? first.getBoundingClientRect().width : null,
      selectors: inputs.map((el) => el.className),
    };
  });

  await page.screenshot({ path: '/tmp/login-styles-proof.png', fullPage: true });
  const out = { proof, screenshot: '/tmp/login-styles-proof.png' };

  fs.writeFileSync('/tmp/login-styles-proof.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));

  await browser.close();
})();
