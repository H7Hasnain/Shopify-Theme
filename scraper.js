// scraper.js - Enhanced Universal Website Scraper
const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs').promises;
const path = require('path');

class EnhancedWebsiteScraper {
    constructor(targetUrl, options = {}) {
        this.targetUrl = targetUrl;
        this.baseUrl = new URL(targetUrl);
        this.options = {
            timeout: options.timeout || 120000,
            waitForDynamic: options.waitForDynamic !== false,
            downloadImages: options.downloadImages !== false,
            inlineImages: options.inlineImages || false,
            maxScrolls: options.maxScrolls || 100,
            screenshotDebug: options.screenshotDebug || false,
            outputDir: options.outputDir || './scraped_output',
            ...options
        };
        this.resources = {
            css: new Map(),
            js: new Map(),
            images: new Map(),
            fonts: new Map(),
            other: new Map()
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(message) {
        console.error(message);
    }

    async fetchResource(url, retries = 5, asBinary = false) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const content = await this._fetchAttempt(url, asBinary);
                if (content !== null && content !== undefined) {
                    return content;
                }
                await this.sleep(1000 * (attempt + 1));
            } catch (e) {
                this.log(`   Retry ${attempt + 1}/${retries} for ${url.substring(url.length - 40)}`);
                if (attempt === retries - 1) {
                    this.log(`   Failed permanently: ${e.message}`);
                }
            }
        }
        return asBinary ? null : '';
    }

    async _fetchAttempt(url, asBinary = false) {
        return new Promise((resolve) => {
            try {
                const parsed = new URL(url);
                const protocol = parsed.protocol === 'https:' ? https : http;

                const request = protocol.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Referer': this.targetUrl,
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'cross-site'
                    },
                    timeout: 60000
                }, (response) => {
                    // Handle redirects
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        const redirectUrl = new URL(response.headers.location, url).href;
                        this.fetchResource(redirectUrl, 3, asBinary).then(resolve);
                        return;
                    }

                    if (response.statusCode === 200) {
                        if (asBinary) {
                            const chunks = [];
                            response.on('data', chunk => chunks.push(chunk));
                            response.on('end', () => resolve(Buffer.concat(chunks)));
                            response.on('error', () => resolve(null));
                        } else {
                            let data = '';
                            response.setEncoding('utf8');
                            response.on('data', chunk => data += chunk);
                            response.on('end', () => resolve(data));
                            response.on('error', () => resolve(''));
                        }
                    } else {
                        this.log(`   HTTP ${response.statusCode} for ${url}`);
                        resolve(asBinary ? null : '');
                    }
                });

                request.on('error', (err) => {
                    this.log(`   Network error: ${err.message}`);
                    resolve(asBinary ? null : '');
                });
                
                request.on('timeout', () => {
                    request.destroy();
                    resolve(asBinary ? null : '');
                });
            } catch (err) {
                this.log(`   Fetch error: ${err.message}`);
                resolve(asBinary ? null : '');
            }
        });
    }

    normalizeUrl(url, base) {
        try {
            if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:')) {
                return null;
            }
            const normalized = new URL(url, base).href;
            return normalized;
        } catch (e) {
            return null;
        }
    }

    async createOutputDir() {
        try {
            await fs.mkdir(this.options.outputDir, { recursive: true });
            await fs.mkdir(path.join(this.options.outputDir, 'images'), { recursive: true });
            await fs.mkdir(path.join(this.options.outputDir, 'fonts'), { recursive: true });
        } catch (e) {
            this.log(`Warning: Could not create output directory: ${e.message}`);
        }
    }

    async scrape() {
        this.log('╔════════════════════════════════════════════╗');
        this.log('║   🚀 ENHANCED UNIVERSAL SCRAPER v2.0      ║');
        this.log('║   Complete Website Cloning & Archiving    ║');
        this.log('╚════════════════════════════════════════════╝\n');
        this.log(`🌐 Target: ${this.targetUrl}\n`);

        let browser;
        
        try {
            await this.createOutputDir();

            this.log('🔧 Launching browser with stealth mode...');
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
                    '--disable-gpu',
                    '--disable-features=VizDisplayCompositor',
                    '--lang=en-US,en',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ],
                ignoreHTTPSErrors: true,
                protocolTimeout: this.options.timeout
            });

            const page = await browser.newPage();
            
            // Set realistic viewport
            await page.setViewport({ 
                width: 1920, 
                height: 1080,
                deviceScaleFactor: 1,
                hasTouch: false,
                isLandscape: true,
                isMobile: false
            });
            
            // Advanced stealth techniques
            await page.evaluateOnNewDocument(() => {
                // Overwrite navigator properties
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
                
                // Add chrome object
                window.chrome = {
                    runtime: {}
                };
                
                // Overwrite permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
                
                // Mock plugins
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5]
                });
                
                // Mock languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en']
                });
            });
            
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            await page.setExtraHTTPHeaders({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            });

            await page.setJavaScriptEnabled(true);
            await page.setCacheEnabled(false);

            // Intercept and log resources
            await page.setRequestInterception(false); // Keep it off for speed
            
            this.log('📄 Loading page with intelligent waiting...\n');

            // Progressive loading strategies
            const strategies = [
                { name: 'Network Idle 0 (Complete)', waitUntil: 'networkidle0', timeout: 180000 },
                { name: 'Network Idle 2 (Most resources)', waitUntil: 'networkidle2', timeout: 120000 },
                { name: 'Load Event', waitUntil: 'load', timeout: 90000 },
                { name: 'DOM Content Loaded', waitUntil: 'domcontentloaded', timeout: 60000 }
            ];

            let loaded = false;
            let finalStrategy = '';
            
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
                    break;
                } catch (e) {
                    this.log(`   ✗ Failed: ${e.message.substring(0, 100)}`);
                }
            }

            if (!loaded) {
                throw new Error('Could not load page with any strategy');
            }

            // Wait for dynamic content
            if (this.options.waitForDynamic) {
                this.log('⏳ Waiting for dynamic content (15 seconds)...');
                await this.sleep(15000);
            }

            // Intelligent scrolling to trigger lazy loading
            this.log('📜 Intelligent scrolling to load lazy content...');
            await page.evaluate(async (maxScrolls) => {
                await new Promise((resolve) => {
                    let scrolls = 0;
                    const distance = 100;
                    const delay = 50;
                    
                    const timer = setInterval(() => {
                        window.scrollBy(0, distance);
                        scrolls++;
                        
                        if (scrolls >= maxScrolls || 
                            (window.innerHeight + window.pageYOffset) >= document.body.scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, delay);
                });
            }, this.options.maxScrolls);

            await this.sleep(2000);

            // Scroll to bottom
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await this.sleep(2000);

            // Scroll back to top
            await page.evaluate(() => window.scrollTo(0, 0));
            await this.sleep(2000);

            // Force load lazy images and reveal hidden content
            this.log('🖼️  Forcing all lazy content to load...');
            await page.evaluate(() => {
                // Force lazy images
                document.querySelectorAll('img').forEach(img => {
                    if (img.loading === 'lazy') img.loading = 'eager';
                    ['data-src', 'data-lazy-src', 'data-original', 'data-lazy-load', 'data-srcset'].forEach(attr => {
                        const val = img.getAttribute(attr);
                        if (val) {
                            if (attr.includes('srcset')) {
                                img.srcset = val;
                            } else {
                                img.src = val;
                            }
                        }
                    });
                    img.removeAttribute('loading');
                });

                // Force picture sources
                document.querySelectorAll('picture source').forEach(source => {
                    ['data-srcset', 'data-src'].forEach(attr => {
                        const val = source.getAttribute(attr);
                        if (val) source.srcset = val;
                    });
                });

                // Show hidden elements
                document.querySelectorAll('[hidden], .hidden, .d-none, [style*="display: none"], [style*="display:none"]').forEach(el => {
                    el.removeAttribute('hidden');
                    el.style.display = '';
                    el.classList.remove('hidden', 'd-none');
                });

                // Expand accordions and tabs
                document.querySelectorAll('[role="tab"], .tab, .accordion-button, [data-toggle], [data-bs-toggle], details').forEach(el => {
                    try {
                        if (el.tagName === 'DETAILS') {
                            el.open = true;
                        } else {
                            el.click();
                            el.setAttribute('aria-expanded', 'true');
                        }
                    } catch (e) {}
                });

                // Trigger hover states for dropdowns
                document.querySelectorAll('.dropdown, [data-hover], .menu-item, .has-dropdown').forEach(el => {
                    el.classList.add('show', 'open', 'active', 'hover');
                    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                });
            });

            await this.sleep(5000);

            if (this.options.screenshotDebug) {
                this.log('📸 Taking debug screenshot...');
                await page.screenshot({ 
                    path: path.join(this.options.outputDir, 'debug_screenshot.png'),
                    fullPage: true 
                });
            }

            this.log('✅ Page fully loaded!\n');

            // Extract all resource URLs
            this.log('📋 Extracting resource URLs...\n');
            
            const resourceUrls = await page.evaluate((baseUrl) => {
                const urls = {
                    css: new Set(),
                    js: new Set(),
                    images: new Set(),
                    fonts: new Set(),
                    videos: new Set()
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

                // CSS files
                document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"], link[href*=".css"]').forEach(el => {
                    const url = normalizeUrl(el.href);
                    if (url) urls.css.add(url);
                });

                // JavaScript files
                document.querySelectorAll('script[src]').forEach(el => {
                    const url = normalizeUrl(el.src);
                    if (url) urls.js.add(url);
                });

                // Images - all sources
                document.querySelectorAll('img, picture source, image, [srcset], video, video source').forEach(el => {
                    // Regular src
                    if (el.src) {
                        const url = normalizeUrl(el.src);
                        if (url) {
                            if (el.tagName === 'VIDEO' || el.parentElement?.tagName === 'VIDEO') {
                                urls.videos.add(url);
                            } else {
                                urls.images.add(url);
                            }
                        }
                    }
                    
                    // Srcset
                    if (el.srcset) {
                        el.srcset.split(',').forEach(src => {
                            const urlPart = src.trim().split(' ')[0];
                            const url = normalizeUrl(urlPart);
                            if (url) urls.images.add(url);
                        });
                    }
                    
                    // Data attributes
                    ['data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'data-srcset'].forEach(attr => {
                        const val = el.getAttribute(attr);
                        if (val) {
                            const url = normalizeUrl(val);
                            if (url) urls.images.add(url);
                        }
                    });
                });

                // Background images from computed styles
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

                // SVG use elements
                document.querySelectorAll('use, image[href], image[xlink\\:href]').forEach(el => {
                    const href = el.href?.baseVal || el.getAttribute('href') || el.getAttribute('xlink:href');
                    if (href && !href.startsWith('#')) {
                        const url = normalizeUrl(href);
                        if (url) urls.images.add(url);
                    }
                });

                // Extract fonts from CSS
                try {
                    for (let sheet of document.styleSheets) {
                        try {
                            for (let rule of sheet.cssRules || sheet.rules || []) {
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
                    fonts: Array.from(urls.fonts),
                    videos: Array.from(urls.videos)
                };
            }, this.targetUrl);

            this.log(`   📋 CSS: ${resourceUrls.css.length} files`);
            this.log(`   📋 JavaScript: ${resourceUrls.js.length} files`);
            this.log(`   📋 Images: ${resourceUrls.images.length} files`);
            this.log(`   📋 Fonts: ${resourceUrls.fonts.length} files`);
            this.log(`   📋 Videos: ${resourceUrls.videos.length} files\n`);

            // Download CSS files
            this.log('🎨 Downloading CSS files...\n');
            for (let i = 0; i < resourceUrls.css.length; i++) {
                const url = resourceUrls.css[i];
                const shortUrl = url.length > 70 ? '...' + url.substring(url.length - 67) : url;
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
            for (let i = 0; i < resourceUrls.fonts.length; i++) {
                const url = resourceUrls.fonts[i];
                const shortUrl = url.length > 70 ? '...' + url.substring(url.length - 67) : url;
                this.log(`   [${i+1}/${resourceUrls.fonts.length}] ${shortUrl}`);
                const content = await this.fetchResource(url, 3, true);
                if (content && content.length > 0) {
                    const base64 = content.toString('base64');
                    const ext = url.split('.').pop().split('?')[0];
                    const mimeType = {
                        'woff2': 'font/woff2',
                        'woff': 'font/woff',
                        'ttf': 'font/ttf',
                        'otf': 'font/otf',
                        'eot': 'application/vnd.ms-fontobject'
                    }[ext] || 'font/woff2';
                    this.resources.fonts.set(url, `data:${mimeType};base64,${base64}`);
                    this.log(`   ✓ ${content.length.toLocaleString()} bytes\n`);
                } else {
                    this.log(`   ✗ Failed\n`);
                }
            }

            // Download or inline images
            if (this.options.downloadImages) {
                this.log(`🖼️  Processing images (${this.options.inlineImages ? 'inlining' : 'downloading'})...\n`);
                const imageLimit = Math.min(resourceUrls.images.length, 200); // Limit for performance
                
                for (let i = 0; i < imageLimit; i++) {
                    const url = resourceUrls.images[i];
                    const shortUrl = url.length > 70 ? '...' + url.substring(url.length - 67) : url;
                    this.log(`   [${i+1}/${imageLimit}] ${shortUrl}`);
                    
                    if (this.options.inlineImages) {
                        const content = await this.fetchResource(url, 3, true);
                        if (content && content.length > 0 && content.length < 500000) { // Max 500KB per image
                            const ext = url.split('.').pop().split('?')[0].toLowerCase();
                            const mimeType = {
                                'jpg': 'image/jpeg',
                                'jpeg': 'image/jpeg',
                                'png': 'image/png',
                                'gif': 'image/gif',
                                'svg': 'image/svg+xml',
                                'webp': 'image/webp',
                                'ico': 'image/x-icon'
                            }[ext] || 'image/jpeg';
                            const base64 = content.toString('base64');
                            this.resources.images.set(url, `data:${mimeType};base64,${base64}`);
                            this.log(`   ✓ Inlined ${content.length.toLocaleString()} bytes\n`);
                        } else {
                            this.log(`   ⚠ Skipped (too large or failed)\n`);
                        }
                    } else {
                        this.resources.images.set(url, url); // Keep original URL
                        this.log(`   ✓ Kept URL\n`);
                    }
                }
            }

            // Extract inline CSS
            this.log('🎨 Extracting inline styles...\n');
            const inlineCSS = await page.evaluate(() => {
                let css = '';

                // Style tags
                document.querySelectorAll('style').forEach(style => {
                    if (style.textContent) {
                        css += `\n/* ========== Inline Style Block ========== */\n${style.textContent}\n`;
                    }
                });

                // Inline styles on elements
                document.querySelectorAll('[style]').forEach((el, idx) => {
                    const style = el.getAttribute('style');
                    if (style && style.trim()) {
                        const id = el.id || el.className || el.tagName.toLowerCase();
                        const selector = el.id ? `#${el.id}` : 
                                        (el.className ? `.${el.className.split(' ').join('.')}` : 
                                        `${el.tagName.toLowerCase()}[data-style-idx="${idx}"]`);
                        
                        if (!el.id && !el.className) {
                            el.setAttribute('data-style-idx', idx);
                        }
                        
                        css += `${selector} { ${style} }\n`;
                    }
                });

                return css;
            });

            this.log(`   ✓ Extracted ${inlineCSS.length.toLocaleString()} characters\n`);

            // Download JavaScript
            this.log('📜 Downloading JavaScript files...\n');
            for (let i = 0; i < resourceUrls.js.length; i++) {
                const url = resourceUrls.js[i];
                const shortUrl = url.length > 70 ? '...' + url.substring(url.length - 67) : url;
                this.log(`   [${i+1}/${resourceUrls.js.length}] ${shortUrl}`);
                const content = await this.fetchResource(url);
                if (content && content.trim()) {
                    this.resources.js.set(url, content);
                    this.log(`   ✓ ${content.length.toLocaleString()} bytes\n`);
                } else {
                    this.log(`   ✗ Failed\n`);
                }
            }

            // Extract inline JavaScript
            this.log('📜 Extracting inline JavaScript...\n');
            const inlineJS = await page.evaluate(() => {
                let js = '';
                document.querySelectorAll('script:not([src])').forEach(script => {
                    const content = script.textContent;
                    if (content && content.trim() && 
                        !content.includes('google-analytics') &&
                        !content.includes('gtag') &&
                        !content.includes('googletagmanager') &&
                        !content.includes('facebook.com/tr') &&
                        !content.includes('fbq(')) {
                        js += `\n/* ========== Inline Script ========== */\n${content}\n`;
                    }
                });
                return js;
            });

            this.log(`   ✓ Extracted ${inlineJS.length.toLocaleString()} characters\n`);

            // Get final HTML
            this.log('🔨 Building final HTML...\n');
            let html = await page.content();

            // Remove old external references
            html = html.replace(/<link[^>]*(?:rel=["']stylesheet["']|href=["'][^"']*\.css)[^>]*>/gi, '');
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

            // Build consolidated CSS
            let finalCSS = '/* ========== External CSS Files ========== */\n\n';
            this.resources.css.forEach((content, url) => {
                let processedContent = content;
                
                // Replace font URLs with data URIs
                this.resources.fonts.forEach((dataUri, fontUrl) => {
                    processedContent = processedContent.replace(new RegExp(fontUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), dataUri);
                });
                
                // Replace image URLs if inlined
                if (this.options.inlineImages) {
                    this.resources.images.forEach((dataUri, imgUrl) => {
                        if (dataUri.startsWith('data:')) {
                            processedContent = processedContent.replace(new RegExp(imgUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), dataUri);
                        }
                    });
                }
                
                finalCSS += `/* Source: ${url} */\n${processedContent}\n\n`;
            });
            
            finalCSS += '\n/* ========== Inline Styles ========== */\n\n' + inlineCSS;

            // Build consolidated JavaScript
            let finalJS = '// ========== External JavaScript Files ==========\n\n';
            this.resources.js.forEach((content, url) => {
                finalJS += `// Source: ${url}\n${content}\n\n`;
            });
            finalJS += '\n// ========== Inline Scripts ==========\n\n' + inlineJS;

            // Create style and script blocks
            const cssBlock = `<style>\n${finalCSS}\n</style>`;
            const jsBlock = `<script>\n${finalJS}\n</script>`;

            // Insert CSS into head
            if (html.includes('</head>')) {
                html = html.replace('</head>', `${cssBlock}\n</head>`);
            } else {
                html = `<head>\n${cssBlock}\n</head>\n${html}`;
            }

            // Insert JavaScript before closing body
            if (html.includes('</body>')) {
                html = html.replace('</body>', `${jsBlock}\n</body>`);
            } else {
                html += `\n${jsBlock}`;
            }

            // Replace image URLs if inlined
            if (this.options.inlineImages) {
                this.resources.images.forEach((dataUri, imgUrl) => {
                    if (dataUri.startsWith('data:')) {
                        const escapedUrl = imgUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\            // Insert CSS into head
            if (html.includes('</head>')) {
                html = html.replace('</head>', `${css');
                        html = html.replace(new RegExp(escapedUrl, 'g'), dataUri);
                    }
                });
            }

            // Ensure proper meta tags
            if (!html.includes('charset')) {
                const metaTags = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
`;
                html = html.replace('<head>', `<head>${metaTags}`);
            }

            // Add base tag to handle relative URLs
            if (!html.includes('<base')) {
                const baseTag = `<base href="${this.targetUrl}">`;
                html = html.replace('<head>', `<head>\n    ${baseTag}`);
            }

            await browser.close();

            // Save to file
            const outputFile = path.join(this.options.outputDir, 'index.html');
            await fs.writeFile(outputFile, html, 'utf8');

            this.log('╔════════════════════════════════════════════╗');
            this.log('║    ✅ SCRAPING COMPLETED SUCCESSFULLY!    ║');
            this.log('╚════════════════════════════════════════════╝\n');
            this.log('📊 Final Summary:\n');
            this.log(`   ✅ CSS files: ${this.resources.css.size} downloaded`);
            this.log(`   ✅ JavaScript files: ${this.resources.js.size} downloaded`);
            this.log(`   ✅ Images: ${this.resources.images.size} processed`);
            this.log(`   ✅ Fonts: ${this.resources.fonts.size} downloaded (as data URIs)`);
            this.log(`   ✅ Total CSS: ${finalCSS.length.toLocaleString()} characters`);
            this.log(`   ✅ Total JavaScript: ${finalJS.length.toLocaleString()} characters`);
            this.log(`   ✅ Final HTML: ${html.length.toLocaleString()} characters`);
            this.log(`   📁 Saved to: ${outputFile}`);
            this.log(`   🎯 Strategy: ${finalStrategy}\n`);

            // Output HTML to stdout for piping
            console.log(html);

            return {
                success: true,
                html: html,
                stats: {
                    cssFiles: this.resources.css.size,
                    jsFiles: this.resources.js.size,
                    images: this.resources.images.size,
                    fonts: this.resources.fonts.size,
                    cssSize: finalCSS.length,
                    jsSize: finalJS.length,
                    htmlSize: html.length,
                    strategy: finalStrategy
                }
            };

        } catch (error) {
            this.log(`\n❌ FATAL ERROR: ${error.message}`);
            this.log(error.stack);
            if (browser) {
                try { 
                    await browser.close(); 
                } catch (e) {
                    this.log(`Warning: Could not close browser: ${e.message}`);
                }
            }
            process.exit(1);
        }
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.error(`
╔════════════════════════════════════════════════════════════════╗
║          ENHANCED UNIVERSAL WEBSITE SCRAPER v2.0              ║
║          Complete Website Cloning & Archiving Tool            ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  node scraper.js <url> [options]

OPTIONS:
  --timeout <ms>          Timeout in milliseconds (default: 120000)
  --no-dynamic            Skip waiting for dynamic content
  --no-images             Skip downloading images
  --inline-images         Inline images as base64 data URIs
  --max-scrolls <n>       Maximum scroll iterations (default: 100)
  --screenshot            Take debug screenshot
  --output-dir <path>     Output directory (default: ./scraped_output)

EXAMPLES:
  node scraper.js https://example.com
  node scraper.js https://example.com --inline-images --screenshot
  node scraper.js https://wordpress-site.com --timeout 180000
  node scraper.js blogger.com --output-dir ./my_scrape

FEATURES:
  ✓ JavaScript-heavy sites (React, Vue, Angular)
  ✓ WordPress, Blogger, Netlify, static sites
  ✓ Lazy-loaded images and content
  ✓ Dynamic dropdowns, tabs, accordions
  ✓ Custom fonts (inlined as data URIs)
  ✓ Complete CSS and JavaScript
  ✓ Background images and SVGs
  ✓ Stealth mode to avoid detection
`);
        process.exit(0);
    }

    let url = args[0];
    const options = {
        timeout: 120000,
        waitForDynamic: true,
        downloadImages: true,
        inlineImages: false,
        maxScrolls: 100,
        screenshotDebug: false,
        outputDir: './scraped_output'
    };

    // Parse command line options
    for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
            case '--timeout':
                options.timeout = parseInt(args[++i]) || 120000;
                break;
            case '--no-dynamic':
                options.waitForDynamic = false;
                break;
            case '--no-images':
                options.downloadImages = false;
                break;
            case '--inline-images':
                options.inlineImages = true;
                break;
            case '--max-scrolls':
                options.maxScrolls = parseInt(args[++i]) || 100;
                break;
            case '--screenshot':
                options.screenshotDebug = true;
                break;
            case '--output-dir':
                options.outputDir = args[++i] || './scraped_output';
                break;
        }
    }

    // Normalize URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    const scraper = new EnhancedWebsiteScraper(url, options);
    scraper.scrape().catch(error => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = EnhancedWebsiteScraper;
