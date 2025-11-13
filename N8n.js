const puppeteer = require('puppeteer');

(async () => {
  const targetUrl = process.argv[2] || 'https://example.com';
  console.log("Scraping:", targetUrl);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(targetUrl, { waitUntil: 'networkidle2' });

  // your scraping logic here
  await page.screenshot({ path: 'output/screenshot.png' });

  await browser.close();
})();
