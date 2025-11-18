// scraper.js - Enhanced Universal Website Scraper (Error-Free Version)
const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs').promises;
const path = require('path');

class EnhancedWebsiteScraper {
    constructor(targetUrl, options = {}) {
        this.targetUrl = targetUrl;
        try {
            this.baseUrl = new URL(targetUrl);
        } catch (e) {
            throw new Error(`Invalid URL: ${targetUrl}`);
        }
        this.options = {
            timeout: options.timeout || 120000,
            waitForDynamic: options.waitForDynamic !== false,
            downloadImages: options.downloadImages !== false,
            inlineImages: options.inlineImages || false,
            maxScrolls: options.maxScrolls || 100,
            screenshotDebug: options.screenshotDebug || false,
            outputDir: options.outputDir || './scraped_output',
            maxImageSize: options.maxImageSize || 500000, // 500KB max per image
            maxImages: options.maxImages || 200,
            ...options
        };
        this.resources = {
            css: new Map(),
            js: new Map(),
            images: new Map(),
            fonts: new Map()
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(message) {
        console.error(message);
    }

    async fetchResource(url, retries = 3, asBinary = false) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const content = await this._fetchAttempt(url, asBinary);
                if (content !== null && content !== undefined) {
                    return content;
                }
                if (attempt < retries - 1) {
                    await this.sleep(1000 * (attempt + 1));
                }
            } catch (e) {
                if (attempt === retries - 1) {
                    this.log(`   ✗ Failed after ${retries} attempts: ${e.message}`);
                }
            }
        }
        return asBinary ? null : '';
    }

    async _fetchAttempt(url, asBinary = false) {
        return new Promise((resolve, reject) => {
            try {
                const parsed = new URL(url);
                const protocol = parsed.protocol === 'https:' ? https : http;

                const request = protocol.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Referer': this.targetUrl,
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Connection': 'keep-alive'
                    },
                    timeout: 30000
                }, (response) => {
                    // Handle redirects
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        try {
                            const redirectUrl = new URL(response.headers.location, url).href;
                            resolve(this.fetchResource(redirectUrl, 2, asBinary));
                        } catch (e) {
                            resolve(asBinary ? null : '');
                        }
                        return;
                    }

                    if (response.statusCode === 200) {
                        if (asBinary) {
                            const chunks = [];
                            response.on('data', chunk => chunks.push(chunk));
                            response.on('end', () => {
                                try {
                                    resolve(Buffer.concat(chunks));
                                } catch (e) {
                                    resolve(null);
                                }
                            });
                            response.on('error', () => resolve(null));
                        } else {
                            let data = '';
                            response.setEncoding('utf8');
                            response.on('data', chunk => data += chunk);
                            response.on('end', () => resolve(data));
                            response.on('error', () => resolve(''));
                        }
                    } else {
                        resolve(asBinary ? null : '');
                    }
                });

                request.on('error', () => resolve(asBinary ? null : ''));
                request.on('timeout', () => {
                    request.destroy();
                    resolve(asBinary ? null : '');
                });

            } catch (err) {
                resolve(asBinary ? null : '');
            }
        });
    }

    async createOutputDir() {
        try {
            await fs.mkdir(this.options.outputDir, { recursive: true });
        } catch (e) {
            // Directory might already exist, that's fine
        }
    }

    async scrape() {
        this.log('╔════════════════════════════════════════════╗');
        this.log('║   🚀 ENHANCED UNIVERSAL SCRAPER v2.0      ║');
        this.log('╚════════════════════════════════════════════╝\n');
        this.log(`🌐 Target: ${this.targetUrl}\n`);

        let browser = null;
        
        try {
            await this.createOutputDir();

            this.log('🔧 Launching browser...');
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                    '--disable-dev-shm-usage',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process'
                ],
                ignoreHTTPSErrors: true,
                protocolTimeout: this.options.timeout
            });

            const page = await browser.newPage();
            
            await page.setViewport({ 
                width: 1920, 
                height: 1080,
                deviceScaleFactor: 1
            });
            
            // Stealth mode
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                window.chrome = { runtime: {} };
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            });
            
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setJavaScriptEnabled(true);

            this.log('📄 Loading page...\n');

            // Try multiple loading strategies
            const strategies = [
                { name: 'networkidle0', waitUntil: 'networkidle0', timeout: 180000 },
                { name: 'networkidle2', waitUntil: 'networkidle2', timeout: 120000 },
                { name: 'load', waitUntil: 'load', timeout: 90000 },
                { name: 'domcontentloaded', waitUntil: 'domcontentloaded', timeout: 60000 }
            ];

            let loaded = false;
            let finalStrategy = '';
            
            for (const strategy of strategies) {
                if (loaded) break;
                try {
                    this.log(`   Trying: ${strategy.name}...`);
                    await page.goto(this.targetUrl, { 
                        waitUntil: strategy.waitUntil, 
                        timeout: strategy.timeout 
                    });
                    this.log(`   ✓ Loaded with ${strategy.name}\n`);
                    loaded = true;
                    finalStrategy = strategy.name;
                    break;
                } catch (e) {
                    this.log(`   ✗ ${strategy.name} failed`);
                }
            }

            if (!loaded) {
                throw new Error('Could not load page with any strategy');
            }

            // Wait for dynamic content
            if (this.options.waitForDynamic) {
                this.log('⏳ Waiting for dynamic content...');
                await this.sleep(10000);
            }

            // Scroll to load lazy content
            this.log('📜 Scrolling to load lazy content...');
            try {
                await page.evaluate(async (maxScrolls) => {
                    await new Promise((resolve) => {
                        let scrolls = 0;
                        const timer = setInterval(() => {
                            window.scrollBy(0, 100);
                            scrolls++;
                            if (scrolls >= maxScrolls || 
                                (window.innerHeight + window.pageYOffset) >= document.body.scrollHeight) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 50);
                    });
                }, this.options.maxScrolls);
                
                await this.sleep(2000);
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await this.sleep(2000);
                await page.evaluate(() => window.scrollTo(0, 0));
                await this.sleep(2000);
            } catch (e) {
                this.log('   Warning: Scrolling encountered issues, continuing...');
            }

            // Force load images and reveal content
            this.log('🖼️  Loading all images and content...');
            try {
                await page.evaluate(() => {
                    // Force lazy images
                    document.querySelectorAll('img').forEach(img => {
                        if (img.loading === 'lazy') img.loading = 'eager';
                        ['data-src', 'data-lazy-src', 'data-original'].forEach(attr => {
                            const val = img.getAttribute(attr);
                            if (val) img.src = val;
                        });
                    });

                    // Show hidden elements
                    document.querySelectorAll('[hidden], .hidden, .d-none').forEach(el => {
                        try {
                            el.removeAttribute('hidden');
                            el.classList.remove('hidden', 'd-none');
                            if (el.style) el.style.display = '';
                        } catch (e) {}
                    });

                    // Expand accordions
                    document.querySelectorAll('details').forEach(el => {
                        try { el.open = true; } catch (e) {}
                    });
                });
                await this.sleep(3000);
            } catch (e) {
                this.log('   Warning: Some content may not be fully loaded');
            }

            if (this.options.screenshotDebug) {
                try {
                    await page.screenshot({ 
                        path: path.join(this.options.outputDir, 'debug_screenshot.png'),
                        fullPage: true 
                    });
                    this.log('📸 Debug screenshot saved\n');
                } catch (e) {
                    this.log('   Warning: Could not save screenshot');
                }
            }

            this.log('✅ Page loaded!\n');

            // Extract resource URLs
            this.log('📋 Extracting resources...\n');
            
            const resourceUrls = await page.evaluate((baseUrl) => {
                const urls = {
                    css: new Set(),
                    js: new Set(),
                    images: new Set(),
                    fonts: new Set()
                };

                const normalizeUrl = (url) => {
                    try {
                        if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:')) {
                            return null;
                        }
                        return new URL(url, baseUrl).href;
                    } catch (e) {
                        return null;
                    }
                };

                // CSS
                document.querySelectorAll('link[rel="stylesheet"], link[href*=".css"]').forEach(el => {
                    const url = normalizeUrl(el.href);
                    if (url) urls.css.add(url);
                });

                // JavaScript
                document.querySelectorAll('script[src]').forEach(el => {
                    const url = normalizeUrl(el.src);
                    if (url) urls.js.add(url);
                });

                // Images
                document.querySelectorAll('img, picture source, [srcset]').forEach(el => {
                    if (el.src) {
                        const url = normalizeUrl(el.src);
                        if (url) urls.images.add(url);
                    }
                    if (el.srcset) {
                        el.srcset.split(',').forEach(src => {
                            const urlPart = src.trim().split(' ')[0];
                            const url = normalizeUrl(urlPart);
                            if (url) urls.images.add(url);
                        });
                    }
                    ['data-src', 'data-lazy-src', 'data-original'].forEach(attr => {
                        const val = el.getAttribute(attr);
                        if (val) {
                            const url = normalizeUrl(val);
                            if (url) urls.images.add(url);
                        }
                    });
                });

                // Background images
                document.querySelectorAll('*').forEach(el => {
                    try {
                        const bg = window.getComputedStyle(el).backgroundImage;
                        if (bg && bg !== 'none') {
                            const matches = bg.match(/url\(["']?([^"')]+)["']?\)/g);
                            if (matches) {
                                matches.forEach(match => {
                                    const urlMatch = match.match(/url\(["']?([^"')]+)["']?\)/);
                                    if (urlMatch) {
                                        const url = normalizeUrl(urlMatch[1]);
                                        if (url) urls.images.add(url);
                                    }
                                });
                            }
                        }
                    } catch (e) {}
                });

                // Fonts from CSS
                try {
                    for (let sheet of document.styleSheets) {
                        try {
                            for (let rule of sheet.cssRules || []) {
                                const cssText = rule.cssText || '';
                                const fontMatches = cssText.match(/url\(["']?([^"')]+\.(woff2?|ttf|eot|otf))["']?\)/gi);
                                if (fontMatches) {
                                    fontMatches.forEach(match => {
                                        const urlMatch = match.match(/url\(["']?([^"')]+)["']?\)/);
                                        if (urlMatch) {
                                            const url = normalizeUrl(urlMatch[1]);
                                            if (url) urls.fonts.add(url);
                                        }
                                    });
                                }
                            }
                        } catch (e) {}
                    }
                } catch (e) {}

                return {
                    css: Array.from(urls.css),
                    js: Array.from(urls.js),
                    images: Array.from(urls.images),
                    fonts: Array.from(urls.fonts)
                };
            }, this.targetUrl);

            this.log(`   📋 CSS: ${resourceUrls.css.length}`);
            this.log(`   📋 JS: ${resourceUrls.js.length}`);
            this.log(`   📋 Images: ${resourceUrls.images.length}`);
            this.log(`   📋 Fonts: ${resourceUrls.fonts.length}\n`);

            // Download CSS
            this.log('🎨 Downloading CSS...\n');
            for (let i = 0; i < Math.min(resourceUrls.css.length, 50); i++) {
                const url = resourceUrls.css[i];
                const shortUrl = url.length > 60 ? '...' + url.slice(-57) : url;
                this.log(`   [${i+1}/${resourceUrls.css.length}] ${shortUrl}`);
                const content = await this.fetchResource(url);
                if (content && content.trim()) {
                    this.resources.css.set(url, content);
                    this.log(`   ✓ ${content.length.toLocaleString()} bytes\n`);
                } else {
                    this.log(`   ✗ Failed\n`);
                }
            }

            // Download fonts
            this.log('🔤 Downloading fonts...\n');
            for (let i = 0; i < Math.min(resourceUrls.fonts.length, 20); i++) {
                const url = resourceUrls.fonts[i];
                const shortUrl = url.length > 60 ? '...' + url.slice(-57) : url;
                this.log(`   [${i+1}/${resourceUrls.fonts.length}] ${shortUrl}`);
                const content = await this.fetchResource(url, 3, true);
                if (content && content.length > 0) {
                    try {
                        const base64 = content.toString('base64');
                        const ext = url.split('.').pop().split('?')[0];
                        const mimeTypes = {
                            'woff2': 'font/woff2',
                            'woff': 'font/woff',
                            'ttf': 'font/ttf',
                            'otf': 'font/otf',
                            'eot': 'application/vnd.ms-fontobject'
                        };
                        const mimeType = mimeTypes[ext] || 'font/woff2';
                        this.resources.fonts.set(url, `data:${mimeType};base64,${base64}`);
                        this.log(`   ✓ ${content.length.toLocaleString()} bytes\n`);
                    } catch (e) {
                        this.log(`   ✗ Encoding failed\n`);
                    }
                } else {
                    this.log(`   ✗ Failed\n`);
                }
            }

            // Process images
            if (this.options.downloadImages && this.options.inlineImages) {
                this.log('🖼️  Inlining images...\n');
                const imageLimit = Math.min(resourceUrls.images.length, this.options.maxImages);
                
                for (let i = 0; i < imageLimit; i++) {
                    const url = resourceUrls.images[i];
                    const shortUrl = url.length > 60 ? '...' + url.slice(-57) : url;
                    this.log(`   [${i+1}/${imageLimit}] ${shortUrl}`);
                    
                    const content = await this.fetchResource(url, 2, true);
                    if (content && content.length > 0 && content.length < this.options.maxImageSize) {
                        try {
                            const ext = url.split('.').pop().split('?')[0].toLowerCase();
                            const mimeTypes = {
                                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
                                'png': 'image/png', 'gif': 'image/gif',
                                'svg': 'image/svg+xml', 'webp': 'image/webp',
                                'ico': 'image/x-icon', 'bmp': 'image/bmp'
                            };
                            const mimeType = mimeTypes[ext] || 'image/jpeg';
                            const base64 = content.toString('base64');
                            this.resources.images.set(url, `data:${mimeType};base64,${base64}`);
                            this.log(`   ✓ ${content.length.toLocaleString()} bytes\n`);
                        } catch (e) {
                            this.log(`   ✗ Encoding failed\n`);
                        }
                    } else {
                        this.log(`   ⚠ Skipped (too large or failed)\n`);
                    }
                }
            }

            // Extract inline CSS
            this.log('🎨 Extracting inline CSS...\n');
            const inlineCSS = await page.evaluate(() => {
                let css = '';
                document.querySelectorAll('style').forEach(style => {
                    if (style.textContent) {
                        css += `\n/* Inline Style Block */\n${style.textContent}\n`;
                    }
                });
                document.querySelectorAll('[style]').forEach((el, idx) => {
                    const style = el.getAttribute('style');
                    if (style && style.trim()) {
                        const selector = el.id ? `#${el.id}` : 
                                        el.className ? `.${el.className.toString().split(' ').join('.')}` :
                                        `${el.tagName.toLowerCase()}[data-s="${idx}"]`;
                        if (!el.id && !el.className) {
                            el.setAttribute('data-s', idx);
                        }
                        css += `${selector} { ${style} }\n`;
                    }
                });
                return css;
            });
            this.log(`   ✓ ${inlineCSS.length.toLocaleString()} characters\n`);

            // Download JavaScript
            this.log('📜 Downloading JavaScript...\n');
            for (let i = 0; i < Math.min(resourceUrls.js.length, 30); i++) {
                const url = resourceUrls.js[i];
                const shortUrl = url.length > 60 ? '...' + url.slice(-57) : url;
                this.log(`   [${i+1}/${resourceUrls.js.length}] ${shortUrl}`);
                const content = await this.fetchResource(url);
                if (content && content.trim()) {
                    this.resources.js.set(url, content);
                    this.log(`   ✓ ${content.length.toLocaleString()} bytes\n`);
                } else {
                    this.log(`   ✗ Failed\n`);
                }
            }

            // Extract inline JS
            this.log('📜 Extracting inline JavaScript...\n');
            const inlineJS = await page.evaluate(() => {
                let js = '';
                document.querySelectorAll('script:not([src])').forEach(script => {
                    const content = script.textContent;
                    if (content && content.trim() && 
                        !content.includes('google-analytics') &&
                        !content.includes('gtag') &&
                        !content.includes('googletagmanager')) {
                        js += `\n/* Inline Script */\n${content}\n`;
                    }
                });
                return js;
            });
            this.log(`   ✓ ${inlineJS.length.toLocaleString()} characters\n`);

            // Build final HTML
            this.log('🔨 Building final HTML...\n');
            let html = await page.content();

            // Remove old references
            html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
            html = html.replace(/<link[^>]*href=["'][^"']*\.css[^"']*["'][^>]*>/gi, '');
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

            // Build CSS
            let finalCSS = '/* External CSS Files */\n\n';
            this.resources.css.forEach((content, url) => {
                let processed = content;
                // Replace font URLs
                this.resources.fonts.forEach((dataUri, fontUrl) => {
                    const escaped = fontUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    processed = processed.replace(new RegExp(escaped, 'g'), dataUri);
                });
                // Replace image URLs if inlined
                if (this.options.inlineImages) {
                    this.resources.images.forEach((dataUri, imgUrl) => {
                        if (dataUri.startsWith('data:')) {
                            const escaped = imgUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            processed = processed.replace(new RegExp(escaped, 'g'), dataUri);
                        }
                    });
                }
                finalCSS += `/* ${url} */\n${processed}\n\n`;
            });
            finalCSS += '\n/* Inline Styles */\n' + inlineCSS;

            // Build JS
            let finalJS = '// External JavaScript Files\n\n';
            this.resources.js.forEach((content, url) => {
                finalJS += `// ${url}\n${content}\n\n`;
            });
            finalJS += '\n// Inline Scripts\n' + inlineJS;

            // Insert into HTML
            const cssBlock = `<style>\n${finalCSS}\n</style>`;
            const jsBlock = `<script>\n${finalJS}\n</script>`;

            if (html.includes('</head>')) {
                html = html.replace('</head>', `${cssBlock}\n</head>`);
            } else {
                html = `<head>\n${cssBlock}\n</head>\n${html}`;
            }

            if (html.includes('</body>')) {
                html = html.replace('</body>', `${jsBlock}\n</body>`);
            } else {
                html += `\n${jsBlock}`;
            }

            // Replace image URLs if inlined
            if (this.options.inlineImages) {
                this.resources.images.forEach((dataUri, imgUrl) => {
                    if (dataUri.startsWith('data:')) {
                        const escaped = imgUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        html = html.replace(new RegExp(escaped, 'g'), dataUri);
                    }
                });
            }

            // Add meta tags if missing
            if (!html.includes('charset')) {
                const meta = '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
                html = html.replace('<head>', `<head>\n${meta}`);
            }

            // Add base tag
            if (!html.includes('<base')) {
                html = html.replace('<head>', `<head>\n<base href="${this.targetUrl}">`);
            }

            await browser.close();
            browser = null;

            // Save to file
            const outputFile = path.join(this.options.outputDir, 'index.html');
            await fs.writeFile(outputFile, html, 'utf8');

            this.log('╔════════════════════════════════════════════╗');
            this.log('║    ✅ SCRAPING COMPLETED!                 ║');
            this.log('╚════════════════════════════════════════════╝\n');
            this.log('📊 Summary:\n');
            this.log(`   ✅ CSS: ${this.resources.css.size} files`);
            this.log(`   ✅ JS: ${this.resources.js.size} files`);
            this.log(`   ✅ Images: ${this.resources.images.size} processed`);
            this.log(`   ✅ Fonts: ${this.resources.fonts.size} inlined`);
            this.log(`   ✅ HTML size: ${html.length.toLocaleString()} bytes`);
            this.log(`   📁 Saved: ${outputFile}`);
            this.log(`   🎯 Strategy: ${finalStrategy}\n`);

            // Output to stdout
            console.log(html);

            return { success: true, html, outputFile };

        } catch (error) {
            this.log(`\n❌ ERROR: ${error.message}`);
            if (error.stack) {
                this.log(error.stack);
            }
            if (browser) {
                try { 
                    await browser.close(); 
                } catch (e) {
                    // Ignore close errors
                }
            }
            process.exit(1);
        }
    }
}

// CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help')) {
        console.error(`
╔════════════════════════════════════════════╗
║  ENHANCED UNIVERSAL WEBSITE SCRAPER v2.0  ║
╚════════════════════════════════════════════╝

USAGE:
  node scraper.js <url> [options]

OPTIONS:
  --timeout <ms>       Timeout (default: 120000)
  --no-dynamic         Skip dynamic content wait
  --no-images          Skip image downloading
  --inline-images      Inline images as base64
  --max-scrolls <n>    Max scroll iterations (default: 100)
  --screenshot         Save debug screenshot
  --output-dir <path>  Output directory (default: ./scraped_output)

EXAMPLES:
  node scraper.js https://example.com
  node scraper.js example.com --inline-images
  node scraper.js https://wordpress.com --screenshot
`);
        process.exit(0);
    }

    let url = args[0];
    const options = {};

    // Parse options
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--timeout' && args[i+1]) {
            options.timeout = parseInt(args[++i]) || 120000;
        } else if (args[i] === '--no-dynamic') {
            options.waitForDynamic = false;
        } else if (args[i] === '--no-images') {
            options.downloadImages = false;
        } else if (args[i] === '--inline-images') {
            options.inlineImages = true;
        } else if (args[i] === '--max-scrolls' && args[i+1]) {
            options.maxScrolls = parseInt(args[++i]) || 100;
        } else if (args[i] === '--screenshot') {
            options.screenshotDebug = true;
        } else if (args[i] === '--output-dir' && args[i+1]) {
            options.outputDir = args[++i];
        }
    }

    // Normalize URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    const scraper = new EnhancedWebsiteScraper(url, options);
    scraper.scrape().catch(error => {
        console.error('❌ Fatal:', error.message);
        process.exit(1);
    });
}

module.exports = EnhancedWebsiteScraper;
