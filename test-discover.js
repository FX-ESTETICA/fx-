const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Go to discover page
  await page.goto('http://localhost:3000/discovery');
  
  // Wait a bit for React to hydrate and fetch data
  await page.waitForTimeout(3000);
  
  // Take a screenshot
  await page.screenshot({ path: 'discover.png' });
  
  // Get all img tags
  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      alt: img.alt,
      width: img.width,
      height: img.height,
      className: img.className
    }));
  });
  
  console.log('Images found:', JSON.stringify(images, null, 2));
  
  await browser.close();
})();