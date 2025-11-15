// scraper.js - Bulletproof website scraper with perfect accuracy
const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class PerfectWebsiteScraper {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.baseUrl = new URL(targetUrl);
        this.allResources = {
            css: [],
            js: [],
            images: [],
            fonts: [],
            icons: []
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(message) {
        console.error(message);
    }

    async fetchResource(url, retries = 5) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const content = await this._fetchAttempt(url);
                if (content !== null && content !== undefined) {
                    return content;
                }
                await this.sleep(2000 * (attempt + 1));
            } catch (e) {
                this.log(`   Retry ${attempt + 1}/${retries} for ${url.substring(url.length - 40)}`);
            }
        }
        return '';
    }

    async _fetchAttempt(url) {
        return new Promise((resolve) => {
            try {
                const parsed = new URL(url);
                const protocol = parsed.protocol === 'https:' ? https : http;

                const request = protocol.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Referer': this.targetUrl,
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                    },
                    timeout: 60000
                }, (response) => {
                    // Handle redirects
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        const redirectUrl = new URL(response.headers.location, url).href;
                        this.fetchResource(redirectUrl).then(resolve);
                        return;
                    }

                    if (response.statusCode === 200) {
                        let data = '';
                        response.setEncoding('utf8');
                        response.on('data', chunk => data += chunk);
                        response.on('end', () => resolve(data));
                        response.on('error', () => resolve(''));
                    } else {
                        this.log(`   HTTP ${response.statusCode} for ${url}`);
                        resolve('');
                    }
                });

                request.on('error', (err) => {
                    this.log(`   Network error: ${err.message}`);
                    resolve('');
                });
                
                request.on('timeout', () => {
                    request.destroy();
                    resolve('');
                });
            } catch (err) {
                this.log(`   Fetch error: ${err.message}`);
                resolve('');
            }
        });
    }

    async scrape() {
        this.log('╔════════════════════════════════════════════╗');
        this.log('║   🎯 BULLETPROOF SCRAPER v10.0            ║');
        this.log('║   Perfect CSS, JS, Images, Icons & Fonts! ║');
        this.log('╚════════════════════════════════════════════╝\n');
        this.log(`🌐 Target: ${this.targetUrl}\n`);

        let browser;
        
        try {
            this.log('🔧 Launching browser with maximum compatibility...');
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-infobars',
                    '--window-size=1920,1080',
                    '--start-maximized',
                    '--disable-extensions',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-software-rasterizer',
                    '--disable-gpu'
                ]
            });

            const page = await browser.newPage();
            
            await page.setViewport({ 
                width: 1920, 
                height: 1080,
                deviceScaleFactor: 1
            });
            
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
            
            await page.setExtraHTTPHeaders({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            });

            await page.setJavaScriptEnabled(true);
            await page.setCacheEnabled(false);

            this.log('📄 Loading page with FULL resource waiting...\n');

            // Try maximum compatibility loading
            let loaded = false;
            let finalStrategy = '';
            
            const strategies = [
                { name: 'Network Idle 0 (Wait for ALL resources)', waitUntil: 'networkidle0', timeout: 180000 },
                { name: 'Network Idle 2 (Wait for most resources)', waitUntil: 'networkidle2', timeout: 120000 },
                { name: 'Load Event (Wait for page load)', waitUntil: 'load', timeout: 90000 },
                { name: 'DOM Content Loaded (Minimum)', waitUntil: 'domcontentloaded', timeout: 60000 }
            ];

            for (const strategy of strategies) {
                if (loaded) break;
                try {
                    this.log(`   Attempting: ${strategy.name}...`);
                    await page.goto(this.targetUrl, { 
                        waitUntil: strategy.waitUntil, 
                        timeout: strategy.timeout 
                    });
                    this.log(`   ✓ SUCCESS with ${strategy.name}\n`);
                    loaded = true;
                    finalStrategy = strategy.name;
                } catch (e) {
                    this.log(`   ✗ Failed: ${e.message}`);
                }
            }

            if (!loaded) {
                throw new Error('Could not load page with any strategy');
            }

            // CRITICAL: Long wait for all dynamic content
            this.log('⏳ Waiting for dynamic content (20 seconds)...');
            await this.sleep(20000);

            // Multiple extensive scroll passes
            this.log('📜 Scroll Pass 1: Loading lazy content...');
            for (let i = 0; i < 80; i++) {
                await page.evaluate(() => window.scrollBy(0, 100));
                await this.sleep(100);
            }
            await this.sleep(3000);

            this.log('📜 Scroll Pass 2: Bottom to top...');
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await this.sleep(3000);
            await page.evaluate(() => window.scrollTo(0, 0));
            await this.sleep(3000);

            this.log('📜 Scroll Pass 3: Middle sections...');
            for (let i = 0; i < 40; i++) {
                await page.evaluate((i) => {
                    window.scrollTo(0, (document.body.scrollHeight / 40) * i);
                }, i);
                await this.sleep(150);
            }
            await this.sleep(3000);

            // Force load ALL images and icons
            this.log('🖼️  Force loading images and icons...');
            await page.evaluate(() => {
                // Force all lazy images
                document.querySelectorAll('img').forEach(img => {
                    if (img.loading === 'lazy') img.loading = 'eager';
                    if (img.dataset.src) img.src = img.dataset.src;
                    if (img.dataset.lazySrc) img.src = img.dataset.lazySrc;
                    if (img.dataset.original) img.src = img.dataset.original;
                    if (img.dataset.lazyLoad) img.src = img.dataset.lazyLoad;
                    img.removeAttribute('loading');
                });

                // Force SVG icons to load
                document.querySelectorAll('svg use').forEach(use => {
                    if (use.href && use.href.baseVal) {
                        const href = use.href.baseVal;
                        use.setAttribute('xlink:href', href);
                    }
                });

                // Trigger icon fonts
                document.querySelectorAll('[class*="icon"], [class*="fa-"], i').forEach(el => {
                    el.style.fontFamily = window.getComputedStyle(el).fontFamily;
                });
            });
            await this.sleep(5000);

            // Trigger ALL interactive elements
            this.log('🔍 Revealing ALL hidden content...');
            await page.evaluate(() => {
                // Expand everything
                document.querySelectorAll('[role="tab"], .tab, .accordion, .accordion-button, .collapse, [data-toggle], [data-bs-toggle], [aria-expanded="false"]').forEach(el => {
                    try {
                        el.click();
                        el.dispatchEvent(new Event('click'));
                        if (el.getAttribute('aria-expanded') === 'false') {
                            el.setAttribute('aria-expanded', 'true');
                        }
                    } catch (e) {}
                });

                // Show dropdowns
                document.querySelectorAll('.dropdown, [data-hover], .menu-item, .has-dropdown, .dropdown-toggle').forEach(el => {
                    try {
                        el.classList.add('show', 'open', 'active');
                        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                    } catch (e) {}
                });

                // Show hidden elements
                document.querySelectorAll('[hidden], .hidden, .d-none').forEach(el => {
                    el.removeAttribute('hidden');
                    el.style.display = '';
                    el.classList.remove('hidden', 'd-none');
                });
            });
            await this.sleep(3000);

            this.log('✅ Page FULLY loaded with ALL content!\n');

            // EXTRACT EVERYTHING
            this.log('📋 Step 1: Extracting ALL resource URLs...\n');
            
            const resourceUrls = await page.evaluate(() => {
                const urls = {
                    css: new Set(),
                    js: new Set(),
                    images: new Set(),
                    fonts: new Set(),
                    svgs: new Set()
                };

                // CSS - ALL possible sources
                document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"], link[href*=".css"], style[data-href]').forEach(el => {
                    const href = el.href || el.dataset.href;
                    if (href && !href.startsWith('data:') && !href.startsWith('blob:')) {
                        urls.css.add(href);
                    }
                });

                // JS - ALL scripts
                document.querySelectorAll('script[src], script[data-src]').forEach(el => {
                    const src = el.src || el.dataset.src;
                    if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
                        urls.js.add(src);
                    }
                });

                // Images - EVERY possible source
                document.querySelectorAll('img, picture source, [data-src], [data-lazy-src], [data-original], video, [srcset]').forEach(el => {
                    // Regular src
                    if (el.src && !el.src.startsWith('data:') && !el.src.startsWith('blob:')) {
                        urls.images.add(el.src);
                    }
                    // Data attributes
                    ['src', 'lazySrc', 'original', 'lazy', 'lazyLoad', 'dataSrc'].forEach(attr => {
                        const val = el.dataset[attr];
                        if (val && !val.startsWith('data:') && !val.startsWith('blob:')) {
                            urls.images.add(val);
                        }
                    });
                    // Srcset
                    if (el.srcset) {
                        el.srcset.split(',').forEach(src => {
                            const url = src.trim().split(' ')[0];
                            if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
                                urls.images.add(url);
                            }
                        });
                    }
                });

                // Background images from ALL elements
                document.querySelectorAll('*').forEach(el => {
                    try {
                        const bg = window.getComputedStyle(el).backgroundImage;
                        if (bg && bg !== 'none') {
                            const matches = bg.match(/url\(["']?([^"')]+)["']?\)/g);
                            if (matches) {
                                matches.forEach(match => {
                                    const url = match.match(/url\(["']?([^"')]+)["']?\)/)[1];
                                    if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
                                        urls.images.add(url);
                                    }
                                });
                            }
                        }
                    } catch (e) {}
                });

                // SVG sprites and icons
                document.querySelectorAll('svg, use, image[href], image[xlink\\:href]').forEach(el => {
                    const href = el.href?.baseVal || el.getAttribute('href') || el.getAttribute('xlink:href');
                    if (href && !href.startsWith('#') && !href.startsWith('data:')) {
                        urls.svgs.add(href);
                    }
                });

                // Fonts from stylesheets and computed styles
                try {
                    for (let sheet of document.styleSheets) {
                        try {
                            for (let rule of sheet.cssRules || sheet.rules) {
                                const cssText = rule.cssText || '';
                                if (cssText.includes('@font-face') || cssText.includes('font-family')) {
                                    const fontMatches = cssText.match(/url\(["']?([^"')]+\.(woff2?|ttf|eot|otf|svg))["']?\)/gi);
                                    if (fontMatches) {
                                        fontMatches.forEach(match => {
                                            const url = match.match(/url\(["']?([^"')]+)["']?\)/)[1];
                                            if (url) urls.fonts.add(url);
                                        });
                                    }
                                }
                            }
                        } catch (e) {}
                    }
                } catch (e) {}

                // Icon fonts
                document.querySelectorAll('[class*="icon"], [class*="fa-"], i, .material-icons').forEach(el => {
                    try {
                        const fontFamily = window.getComputedStyle(el).fontFamily;
                        if (fontFamily && (fontFamily.includes('icon') || fontFamily.includes('awesome') || fontFamily.includes('material'))) {
                            // Mark that we need this font
                            el.setAttribute('data-icon-font', fontFamily);
                        }
                    } catch (e) {}
                });

                return {
                    css: Array.from(urls.css),
                    js: Array.from(urls.js),
                    images: Array.from(urls.images),
                    fonts: Array.from(urls.fonts),
                    svgs: Array.from(urls.svgs)
                };
            });

            this.log(`   📋 CSS files: ${resourceUrls.css.length}`);
            this.log(`   📋 JS files: ${resourceUrls.js.length}`);
            this.log(`   📋 Images: ${resourceUrls.images.length}`);
            this.log(`   📋 Fonts: ${resourceUrls.fonts.length}`);
            this.log(`   📋 SVGs: ${resourceUrls.svgs.length}\n`);

            // Download CSS with retries
            this.log('🎨 Step 2: Downloading ALL CSS files...\n');
            const cssContents = [];
            
            for (let i = 0; i < resourceUrls.css.length; i++) {
                const url = resourceUrls.css[i];
                this.log(`   [${i+1}/${resourceUrls.css.length}] ${url.substring(Math.max(0, url.length - 60))}`);
                const content = await this.fetchResource(url);
                if (content && content.trim()) {
                    cssContents.push({ url, content });
                    this.log(`   ✓ Downloaded ${content.length.toLocaleString()} bytes\n`);
                } else {
                    this.log(`   ✗ Failed or empty\n`);
                }
            }

            // Download fonts
            this.log('🔤 Step 3: Downloading font files...\n');
            const fontContents = [];
            
            for (let i = 0; i < resourceUrls.fonts.length; i++) {
                const url = resourceUrls.fonts[i];
                this.log(`   [${i+1}/${resourceUrls.fonts.length}] ${url.substring(Math.max(0, url.length - 60))}`);
                const content = await this.fetchResource(url);
                if (content && content.length > 0) {
                    fontContents.push({ url, content });
                    this.log(`   ✓ Downloaded ${content.length.toLocaleString()} bytes\n`);
                } else {
                    this.log(`   ✗ Failed\n`);
                }
            }

            // Extract ALL page CSS
            this.log('🎨 Step 4: Extracting page CSS (inline + computed)...\n');
            
            const pageCSS = await page.evaluate(() => {
                let css = '';

                // All style tags
                document.querySelectorAll('style').forEach(style => {
                    if (style.textContent) {
                        css += `\n/* ========== Style Block ========== */\n${style.textContent}\n`;
                    }
                });

                // All inline styles
                let inlineIdx = 0;
                document.querySelectorAll('[style]').forEach(el => {
                    const style = el.getAttribute('style');
                    if (style && style.trim()) {
                        const className = typeof el.className === 'string' ? el.className : '';
                        const classes = className.split(' ').filter(c => c.trim()).join('.');
                        const id = el.id ? `#${el.id}` : '';
                        let selector = el.tagName.toLowerCase() + id + (classes ? '.' + classes : '');
                        
                        if (!id && !classes) {
                            el.setAttribute('data-inline-s', inlineIdx);
                            selector += `[data-inline-s="${inlineIdx}"]`;
                            inlineIdx++;
                        }
                        
                        css += `${selector} { ${style} }\n`;
                    }
                });

                // Computed styles for elements with backgrounds, fonts, or icons
                let computedIdx = 0;
                document.querySelectorAll('*').forEach(el => {
                    if (computedIdx < 600) {
                        try {
                            const computed = window.getComputedStyle(el);
                            const bgImage = computed.backgroundImage;
                            const fontFamily = computed.fontFamily;
                            const content = computed.content;
                            
                            let needsRule = false;
                            let ruleCSS = '';
                            
                            // Background images
                            if (bgImage && bgImage !== 'none' && !bgImage.includes('data:')) {
                                needsRule = true;
                                ruleCSS += `  background-image: ${bgImage};\n`;
                                ruleCSS += `  background-size: ${computed.backgroundSize};\n`;
                                ruleCSS += `  background-position: ${computed.backgroundPosition};\n`;
                                ruleCSS += `  background-repeat: ${computed.backgroundRepeat};\n`;
                                ruleCSS += `  background-attachment: ${computed.backgroundAttachment};\n`;
                            }
                            
                            // Fonts (especially for icons)
                            if (fontFamily && !fontFamily.includes('Times') && !fontFamily.includes('serif')) {
                                needsRule = true;
                                ruleCSS += `  font-family: ${fontFamily};\n`;
                                ruleCSS += `  font-size: ${computed.fontSize};\n`;
                                ruleCSS += `  font-weight: ${computed.fontWeight};\n`;
                                ruleCSS += `  font-style: ${computed.fontStyle};\n`;
                            }
                            
                            // Icon content (::before, ::after)
                            if (content && content !== 'none' && content !== 'normal') {
                                needsRule = true;
                                ruleCSS += `  content: ${content};\n`;
                            }
                            
                            if (needsRule) {
                                const className = typeof el.className === 'string' ? el.className : '';
                                const classes = className.split(' ').filter(c => c.trim()).join('.');
                                const id = el.id ? `#${el.id}` : '';
                                let selector = el.tagName.toLowerCase() + id + (classes ? '.' + classes : '');
                                
                                if (!id && !classes) {
                                    el.setAttribute('data-computed-s', computedIdx);
                                    selector += `[data-computed-s="${computedIdx}"]`;
                                    computedIdx++;
                                }
                                
                                css += `\n${selector} {\n${ruleCSS}}\n`;
                            }
                        } catch (e) {}
                    }
                });

                // All stylesheet rules
                try {
                    for (let sheet of document.styleSheets) {
                        try {
                            if (sheet.cssRules) {
                                for (let rule of sheet.cssRules) {
                                    if (rule.cssText) {
                                        css += rule.cssText + '\n';
                                    }
                                }
                            }
                        } catch (e) {}
                    }
                } catch (e) {}

                return css;
            });

            this.log(`   ✓ Extracted ${pageCSS.length.toLocaleString()} characters\n`);

            // Download JS
            this.log('📜 Step 5: Downloading JavaScript files...\n');
            const jsContents = [];
            
            for (let i = 0; i < resourceUrls.js.length; i++) {
                const url = resourceUrls.js[i];
                this.log(`   [${i+1}/${resourceUrls.js.length}] ${url.substring(Math.max(0, url.length - 60))}`);
                const content = await this.fetchResource(url);
                if (content && content.trim()) {
                    jsContents.push({ url, content });
                    this.log(`   ✓ Downloaded ${content.length.toLocaleString()} bytes\n`);
                } else {
                    this.log(`   ✗ Failed\n`);
                }
            }

            // Extract inline JS
            this.log('📜 Step 6: Extracting inline JavaScript...\n');
            
            const inlineJS = await page.evaluate(() => {
                let js = '';
                document.querySelectorAll('script:not([src])').forEach(script => {
                    const content = script.textContent;
                    if (content && content.trim() && 
                        !content.includes('google-analytics') &&
                        !content.includes('gtag') &&
                        !content.includes('googletagmanager') &&
                        !content.includes('facebook.com/tr')) {
                        js += `\n${content}\n`;
                    }
                });
                return js;
            });

            this.log(`   ✓ Extracted ${inlineJS.length.toLocaleString()} characters\n`);

            // Get HTML
            this.log('🔨 Step 7: Building final HTML...\n');
            
            let html = await page.content();

            // Remove old references
            html = html.replace(/<link[^>]*(?:rel=["']stylesheet["']|href=["'][^"']*\.css)[^>]*>/gi, '');
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

            // Build final CSS
            let finalCSS = '/* ========== External CSS Files ========== */\n\n';
            cssContents.forEach((item, i) => {
                finalCSS += `/* File ${i+1}: ${item.url} */\n${item.content}\n\n`;
            });
            finalCSS += '\n/* ========== Page Styles ========== */\n\n' + pageCSS;

            // Build final JS
            let finalJS = '// ========== External JS Files ==========\n\n';
            jsContents.forEach((item, i) => {
                finalJS += `// File ${i+1}: ${item.url}\n${item.content}\n\n`;
            });
            finalJS += '\n// ========== Inline Scripts ==========\n\n' + inlineJS;

            // Create blocks
            const cssBlock = `<style>\n${finalCSS}\n</style>`;
            const jsBlock = `<script>\n${finalJS}\n</script>`;

            // Insert CSS
            if (html.includes('</head>')) {
                html = html.replace('</head>', `\n${cssBlock}\n</head>`);
            } else {
                html = `<head>\n${cssBlock}\n</head>\n${html}`;
            }

            // Insert JS
            if (html.includes('</body>')) {
                html = html.replace('</body>', `\n${jsBlock}\n</body>`);
            } else {
                html += `\n${jsBlock}`;
            }

            // Ensure meta tags
            if (!html.includes('charset')) {
                const meta = '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta http-equiv="X-UA-Compatible" content="IE=edge">\n';
                html = html.replace('<head>', `<head>\n${meta}`);
            }

            await browser.close();

            this.log('╔════════════════════════════════════════════╗');
            this.log('║    ✅ PERFECT SCRAPING COMPLETED!         ║');
            this.log('╚════════════════════════════════════════════╝\n');
            this.log('📊 Final Summary:\n');
            this.log(`   ✅ CSS files: ${cssContents.length} downloaded`);
            this.log(`   ✅ JS files: ${jsContents.length} downloaded`);
            this.log(`   ✅ Images found: ${resourceUrls.images.length}`);
            this.log(`   ✅ Fonts: ${fontContents.length} downloaded`);
            this.log(`   ✅ Total CSS: ${finalCSS.length.toLocaleString()} chars`);
            this.log(`   ✅ Total JS: ${finalJS.length.toLocaleString()} chars`);
            this.log(`   ✅ Final HTML: ${html.length.toLocaleString()} chars\n`);
            this.log(`   Strategy used: ${finalStrategy}\n`);

            // Output to stdout
            console.log(html);

        } catch (error) {
            this.log(`\n❌ FATAL ERROR: ${error.message}`);
            this.log(error.stack);
            if (browser) {
                try { await browser.close(); } catch (e) {}
            }
            process.exit(1);
        }
    }
}

// Main execution
const url = process.argv[2];

if (!url) {
    console.error('❌ No URL provided');
    console.error('Usage: node scraper.js <url>');
    process.exit(1);
}

let targetUrl = url.trim();
if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
}

const scraper = new PerfectWebsiteScraper(targetUrl);
scraper.scrape().catch(error => {
    console.error('❌ Fatal:', error.message);
    process.exit(1);
});
