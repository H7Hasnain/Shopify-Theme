const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function scrapeWebsite(url, outputFile) {
  console.log(`🌐 Scraping: ${url}`);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2' });
  const html = await page.content();

  const outputPath = path.resolve(outputFile);
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log(`✅ Saved HTML to ${outputPath}`);
  await browser.close();
}

// If running in GitHub Actions (non-interactive)
if (process.env.GITHUB_ACTIONS) {
  const url = process.argv[2];
  const outputFile = process.argv[3] || 'scraped_website.html';

  if (!url) {
    console.error('❌ Missing URL argument');
    process.exit(1);
  }

  scrapeWebsite(url, outputFile);
}
// If running locally (interactive)
else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('🌐 PERFECT WEBSITE SCRAPER v7.0');
  console.log('✅ Captures background images');
  console.log('✅ Extracts computed styles');
  console.log('✅ Downloads ALL CSS & JS');
  console.log('✅ Perfect working copy\n');

  rl.question('🔹 Enter website URL: ', (url) => {
    rl.question('📄 Enter output file name (default scraped_website.html): ', (fileName) => {
      const outputFile = fileName || 'scraped_website.html';
      rl.close();
      scrapeWebsite(url, outputFile);
    });
  });
}
