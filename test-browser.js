const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err));
  
  await page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  
  const text = await page.evaluate(() => document.body.innerText);
  const debugMatch = text.match(/Debug: loading=\w+, id=[\w_-]+/g);
  if (debugMatch) {
    console.log('Found Debug strings:', debugMatch);
  } else {
    console.log('Debug strings not found. Body text snippet:', text.substring(0, 200));
  }
  
  await browser.close();
})();
