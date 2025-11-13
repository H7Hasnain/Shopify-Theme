const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class PerfectWebsiteScraper {
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
                        'Referer': this.targetUrl,
                        'Accept-Encoding': 'identity'
                    }
                }, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        const redirectUrl = new URL(response.headers.location, url).href;
                        this.fetchResource(redirectUrl).then(resolve);
                        return;
                    }

                    if (response.statusCode === 200) {
                        response.on('data', chunk => chunks.push(chunk));
                        response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
                    } else resolve('');
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
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            await page.goto(this.targetUrl, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'], timeout: 90000 });
            await this.sleep(5000);

            // Scroll to load dynamic content
            await page.evaluate(async () => {
                await new Promise(resolve => {
                    let totalScrolls = 0;
                    const interval = setInterval(() => {
                        window.scrollBy(0, 150);
                        totalScrolls++;
                        if (totalScrolls >= 40) {
                            clearInterval(interval);
                            window.scrollTo(0, 0);
                            setTimeout(resolve, 2000);
                        }
                    }, 100);
                });
            });

            // Extract CSS
            const allCSS = await page.evaluate(() => {
                let cssText = '';
                try {
                    for (let sheet of document.styleSheets) {
                        try {
                            for (let rule of sheet.cssRules || sheet.rules) {
                                if (rule.cssText) cssText += rule.cssText + '\n';
                            }
                        } catch {}
                    }
                } catch {}
                document.querySelectorAll('[style]').forEach(el => {
                    try {
                        const style = el.getAttribute('style');
                        if (style) cssText += `${el.tagName.toLowerCase()} { ${style} }\n`;
                    } catch {}
                });
                document.querySelectorAll('style').forEach(style => {
                    cssText += style.textContent + '\n';
                });
                return cssText;
            });

            // Download external CSS
            const cssLinks = await page.evaluate(() => Array.from(document.querySelectorAll('link[rel="stylesheet"], link[href*=".css"]'), l => l.href));
            let externalCSS = '';
            for (const cssUrl of cssLinks) {
                const content = await this.fetchResource(cssUrl);
                if (content) externalCSS += `/* ${cssUrl} */\n${content}\n`;
            }

            // Extract JS
            const allJS = await page.evaluate(() => {
                let jsText = '';
                document.querySelectorAll('script:not([src])').forEach(script => {
                    if (script.textContent && !script.textContent.includes('google-analytics')) {
                        jsText += script.textContent + '\n';
                    }
                });
                return jsText;
            });

            const jsLinks = await page.evaluate(() => Array.from(document.querySelectorAll('script[src]'), s => s.src));
            let externalJS = '';
            for (const jsUrl of jsLinks) {
                const content = await this.fetchResource(jsUrl);
                if (content) externalJS += `// ${jsUrl}\n${content}\n`;
            }

            // Get page HTML
            let html = await page.content();
            html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

            const finalCSS = externalCSS + '\n' + allCSS;
            const finalJS = externalJS + '\n' + allJS;

            const cssBlock = `<style>\n${finalCSS}\n</style>\n`;
            const jsBlock = `<script>\n${finalJS}\n</script>\n`;

            html = html.replace('</head>', cssBlock + '</head>');
            html = html.replace('</body>', jsBlock + '</body>');

            await browser.close();

            return html;
        } catch (error) {
            if (browser) await browser.close();
            throw error;
        }
    }
}

module.exports = async function(inputUrl) {
    if (!inputUrl) throw new Error('No URL provided');
    const scraper = new PerfectWebsiteScraper(inputUrl);
    const resultHtml = await scraper.scrape();
    return resultHtml;
};
