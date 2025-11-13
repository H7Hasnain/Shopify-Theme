// scraper.js - Returns scraped HTML to stdout for n8n
const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class WebsiteScraper {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.baseUrl = new URL(targetUrl);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchResource(url) {
        return new Promise((resolve) => {
            try {
                const parsed = new URL(url);
                const protocol = parsed.protocol === 'https:' ? https : http;

                let chunks = [];
                
                const request = protocol.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*',
                        'Referer': this.targetUrl
                    }
                }, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        const redirectUrl = new URL(response.headers.location, url).href;
                        this.fetchResource(redirectUrl).then(resolve);
                        return;
                    }

                    if (response.statusCode === 200) {
                        response.on('data', chunk => chunks.push(chunk));
                        response.on('end', () => {
                            const data = Buffer.concat(chunks).toString('utf8');
                            resolve(data);
                        });
                    } else {
                        resolve('');
                    }
                });

                request.on('error', () => resolve(''));
                request.setTimeout(30000, () => {
                    request.destroy();
                    resolve('');
                });
            } catch {
                resolve('');
            }
        });
    }

    async scrape() {
        console.error('🚀 Starting website scraper...');
        console.error(`🌐 Target: ${this.targetUrl}`);

        let browser;
        
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-dev-shm-usage'
                ]
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            console.error('📄 Loading page...');

            // Load page with fallback strategies
            try {
                await page.goto(this.targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });
            } catch {
                try {
                    await page.goto(this.targetUrl, { waitUntil: 'load', timeout: 45000 });
                } catch {
                    await page.goto(this.targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                }
            }

            console.error('⏳ Waiting for content...');
            await this.sleep(6000);

            // Scroll to load lazy content
            console.error('📜 Loading lazy content...');
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let count = 0;
                    const interval = setInterval(() => {
                        window.scrollBy(0, 200);
                        count++;
                        if (count > 30) {
                            clearInterval(interval);
                            window.scrollTo(0, 0);
                            resolve();
                        }
                    }, 100);
                });
            });

            await this.sleep(3000);

            console.error('✅ Page loaded!');

            // Extract ALL CSS including computed styles
            console.error('🎨 Extracting CSS...');

            const allCSS = await page.evaluate(() => {
                let cssText = '';

                // Get stylesheet rules
                try {
                    for (let sheet of document.styleSheets) {
                        try {
                            for (let rule of sheet.cssRules || sheet.rules) {
                                if (rule.cssText) {
                                    cssText += rule.cssText + '\n';
                                }
                            }
                        } catch (e) {}
                    }
                } catch (e) {}

                // Get inline styles
                document.querySelectorAll('[style]').forEach(el => {
                    try {
                        const style = el.getAttribute('style');
                        if (style) {
                            const className = typeof el.className === 'string' ? el.className : '';
                            const classes = className.split(' ').filter(c => c).join('.');
                            const id = el.id ? `#${el.id}` : '';
                            const selector = el.tagName.toLowerCase() + id + (classes ? '.' + classes : '');
                            cssText += `${selector} { ${style} }\n`;
                        }
                    } catch (e) {}
                });

                // Get computed styles for elements with backgrounds
                const elementsWithBg = document.querySelectorAll('body, section, div, header, nav, main, footer');
                elementsWithBg.forEach((el, index) => {
                    try {
                        if (index < 150) {
                            const computed = window.getComputedStyle(el);
                            const bgImage = computed.backgroundImage;
                            
                            if (bgImage && bgImage !== 'none' && !bgImage.includes('data:')) {
                                const className = typeof el.className === 'string' ? el.className : '';
                                const classes = className.split(' ').filter(c => c).join('.');
                                const id = el.id ? `#${el.id}` : '';
                                let selector = el.tagName.toLowerCase() + id + (classes ? '.' + classes : '');
                                
                                if (!selector.includes('#') && !selector.includes('.')) {
                                    selector = `${selector}[data-index="${index}"]`;
                                    el.setAttribute('data-index', index);
                                }

                                cssText += `${selector} {\n`;
                                cssText += `  background-image: ${bgImage};\n`;
                                cssText += `  background-size: ${computed.backgroundSize};\n`;
                                cssText += `  background-position: ${computed.backgroundPosition};\n`;
                                cssText += `  background-repeat: ${computed.backgroundRepeat};\n`;
                                if (computed.height !== 'auto') cssText += `  height: ${computed.height};\n`;
                                if (computed.minHeight !== '0px') cssText += `  min-height: ${computed.minHeight};\n`;
                                cssText += `}\n`;
                            }
                        }
                    } catch (e) {}
                });

                // Style tags
                document.querySelectorAll('style').forEach(style => {
                    cssText += style.textContent + '\n';
                });

                return cssText;
            });

            // Get external CSS
            console.error('📥 Downloading CSS files...');
            const cssLinks = await page.evaluate(() => {
                const links = [];
                document.querySelectorAll('link[rel="stylesheet"], link[href*=".css"]').forEach(link => {
                    if (link.href) links.push(link.href);
                });
                return links;
            });

            let externalCSS = '';
            for (const cssUrl of cssLinks) {
                const content = await this.fetchResource(cssUrl);
                if (content && content.trim()) {
                    externalCSS += content + '\n';
                }
            }

            // Get JavaScript
            console.error('📜 Extracting JavaScript...');

            const allJS = await page.evaluate(() => {
                let jsText = '';
                document.querySelectorAll('script:not([src])').forEach(script => {
                    const content = script.textContent;
                    if (content && content.trim() && 
                        !content.includes('google-analytics') &&
                        !content.includes('gtag')) {
                        jsText += content + '\n\n';
                    }
                });
                return jsText;
            });

            // Get external JS
            console.error('📥 Downloading JS files...');
            const jsLinks = await page.evaluate(() => {
                const links = [];
                document.querySelectorAll('script[src]').forEach(script => {
                    if (script.src) links.push(script.src);
                });
                return links;
            });

            let externalJS = '';
            for (const jsUrl of jsLinks) {
                const content = await this.fetchResource(jsUrl);
                if (content && content.trim()) {
                    externalJS += content + '\n';
                }
            }

            // Get HTML
            console.error('🔨 Building final HTML...');
            let html = await page.content();

            // Remove old references
            html = html.replace(/<link[^>]*(?:rel=["']stylesheet["']|href=["'][^"']*\.css)[^>]*>/gi, '');
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

            // Combine CSS and JS
            const finalCSS = externalCSS + '\n' + allCSS;
            const finalJS = externalJS + '\n' + allJS;

            // Create blocks
            const cssBlock = `<style>\n${finalCSS}\n</style>`;
            const jsBlock = `<script>\n${finalJS}\n</script>`;

            // Insert CSS
            if (html.includes('</head>')) {
                html = html.replace('</head>', cssBlock + '\n</head>');
            } else {
                html = '<head>\n' + cssBlock + '\n</head>\n' + html;
            }

            // Insert JS
            if (html.includes('</body>')) {
                html = html.replace('</body>', jsBlock + '\n</body>');
            } else {
                html += '\n' + jsBlock;
            }

            // Add meta tags
            if (!html.includes('charset')) {
                const meta = '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
                html = html.replace('<head>', '<head>\n' + meta);
            }

            await browser.close();

            console.error('✅ Scraping completed successfully!');
            
            // Output HTML to stdout (this goes back to n8n)
            console.log(html);

        } catch (error) {
            console.error('❌ Error:', error.message);
            if (browser) await browser.close();
            process.exit(1);
        }
    }
}

// Get URL from command line argument
const url = process.argv[2];

if (!url) {
    console.error('❌ Error: No URL provided');
    console.error('Usage: node scraper.js <url>');
    process.exit(1);
}

// Start scraping
const scraper = new WebsiteScraper(url);
scraper.scrape().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
});
