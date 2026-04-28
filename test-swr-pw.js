const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('file://' + path.resolve('test-swr-browser.html'));
  
  // Wait a bit to let it render and fail
  await page.waitForTimeout(2000);
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log('Final text:', text);
  
  await browser.close();
})();