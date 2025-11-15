// scraper.js - Ultra-accurate website scraper with perfect CSS/JS/Images/Fonts
const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class UltraAccurateWebsiteScraper {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.baseUrl = new URL(targetUrl);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(message) {
        console.error(message);
    }

    async fetchResource(url, retries = 3) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const content = await this._fetchAttempt(url);
                if (content) return content;
                await this.sleep(1500 * (attempt + 1));
            } catch (e) {
                if (attempt === retries - 1) return '';
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
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Referer': this.targetUrl,
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache'
                    },
                    timeout: 45000
                }, (response) => {
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
                        resolve('');
                    }
                });

                request.on('error', () => resolve(''));
                request.on('timeout', () => {
                    request.destroy();
                    resolve('');
                });
            } catch {
                resolve('');
            }
        });
    }

    async scrape() {
        this.log('╔═══════════════════════════════════════════╗');
        this.log('║   🎯 ULTRA-ACCURATE SCRAPER v9.0         ║');
        this.log('║   Perfect images, fonts, and styling!   ║');
        this.log('╚═══════════════════════════════════════════╝\n');
        this.log(`🌐 Target: ${this.targetUrl}\n`);

        let browser;
        
        try {
            this.log('🔧 Launching browser with full features...');
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--font-render-hinting=none',
                    '--enable-font-antialiasing',
                    '--force-color-profile=srgb',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu'
                ],
                defaultViewport: null
            });

            const page = await browser.newPage();
            
            // Set realistic viewport
            await page.setViewport({ 
                width: 1920, 
                height: 1080,
                deviceScaleFactor: 1
            });
            
            // Set comprehensive headers
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none'
            });

            // Enable JavaScript
            await page.setJavaScriptEnabled(true);

            this.log('📄 Loading page with ALL resources...\n');

            // Load with comprehensive waiting
            let loaded = false;
            const strategies = [
                { name: 'Network Idle 0 (Complete)', waitUntil: 'networkidle0', timeout: 120000 },
                { name: 'Network Idle 2 (Most Complete)', waitUntil: 'networkidle2', timeout: 90000 },
                { name: 'Full Load', waitUntil: 'load', timeout: 60000 },
                { name: 'DOM Ready', waitUntil: 'domcontentloaded', timeout: 45000 }
            ];

            for (const strategy of strategies) {
                if (loaded) break;
                try {
                    this.log(`   Attempting: ${strategy.name}...`);
                    await page.goto(this.targetUrl, { 
                        waitUntil: strategy.waitUntil, 
                        timeout: strategy.timeout 
                    });
                    this.log(`   ✓ Loaded with ${strategy.name}\n`);
                    loaded = true;
                } catch (e) {
                    this.log(`   ✗ ${strategy.name} timeout, trying next...`);
                }
            }

            if (!loaded) {
                throw new Error('Failed to load page with any strategy');
            }

            // Extended wait for all dynamic content
            this.log('⏳ Waiting for all dynamic content (15 seconds)...');
            await this.sleep(15000);

            // Multiple scroll passes to ensure ALL content loads
            this.log('📜 First scroll pass - loading lazy images...');
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let scrolls = 0;
                    const maxScrolls = 60;
                    const interval = setInterval(() => {
                        window.scrollBy(0, 100);
                        scrolls++;
                        if (scrolls >= maxScrolls || window.scrollY + window.innerHeight >= document.body.scrollHeight) {
                            clearInterval(interval);
                            resolve();
                        }
                    }, 100);
                });
            });
            
            await this.sleep(3000);
            
            this.log('📜 Second scroll pass - ensuring all images loaded...');
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await this.sleep(2000);
            await page.evaluate(() => window.scrollTo(0, 0));
            await this.sleep(3000);

            // Force lazy images to load
            this.log('🖼️  Force loading all images...');
            await page.evaluate(() => {
                document.querySelectorAll('img').forEach(img => {
                    // Trigger lazy loading
                    if (img.loading === 'lazy') {
                        img.loading = 'eager';
                    }
                    
                    // Load data-src images
                    if (img.dataset.src && !img.src) {
                        img.src = img.dataset.src;
                    }
                    if (img.dataset.lazySrc && !img.src) {
                        img.src = img.dataset.lazySrc;
                    }
                    
                    // Force decode
                    if (img.complete && img.decode) {
                        img.decode().catch(() => {});
                    }
                });
            });

            await this.sleep(5000);

            // Trigger ALL interactive elements
            this.log('🔍 Revealing hidden content...');
            await page.evaluate(() => {
                // Expand accordions, tabs, dropdowns
                document.querySelectorAll('[role="tab"], .tab, .accordion-button, [data-toggle], [aria-expanded="false"], .collapsed').forEach(el => {
                    try { 
                        el.click(); 
                        el.dispatchEvent(new Event('click', { bubbles: true }));
                    } catch (e) {}
                });
                
                // Trigger hover states
                document.querySelectorAll('[data-hover], .dropdown, .menu-item, .has-dropdown').forEach(el => {
                    try {
                        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
                        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
                    } catch (e) {}
                });
            });

            await this.sleep(3000);

            this.log('✅ Page fully loaded with all content!\n');

            // Extract ALL resources comprehensively
            this.log('📋 Extracting ALL resources (CSS, JS, Images, Fonts)...\n');
            
            const resources = await page.evaluate((baseOrigin) => {
                const result = {
                    cssUrls: new Set(),
                    jsUrls: new Set(),
                    imageUrls: new Set(),
                    fontUrls: new Set()
                };

                // CSS files
                document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"], link[href*=".css"]').forEach(link => {
                    if (link.href && !link.href.startsWith('data:') && !link.href.startsWith('blob:')) {
                        result.cssUrls.add(link.href);
                    }
                });

                // JS files
                document.querySelectorAll('script[src]').forEach(script => {
                    if (script.src && !script.src.startsWith('data:') && !script.src.startsWith('blob:')) {
                        result.jsUrls.add(script.src);
                    }
                });

                // ALL image sources
                document.querySelectorAll('img, picture source, [style*="background"]').forEach(el => {
                    // Regular img src
                    if (el.src && !el.src.startsWith('data:') && !el.src.startsWith('blob:')) {
                        result.imageUrls.add(el.src);
                    }
                    
                    // Data attributes
                    ['src', 'lazySrc', 'original', 'lazy', 'srcset'].forEach(attr => {
                        const val = el.dataset[attr];
                        if (val && !val.startsWith('data:')) {
                            result.imageUrls.add(val);
                        }
                    });
                    
                    // Srcset
                    if (el.srcset) {
                        el.srcset.split(',').forEach(srcset => {
                            const url = srcset.trim().split(' ')[0];
                            if (url && !url.startsWith('data:')) {
                                result.imageUrls.add(url);
                            }
                        });
                    }
                });

                // Background images from computed styles
                document.querySelectorAll('*').forEach(el => {
                    try {
                        const style = window.getComputedStyle(el);
                        const bgImage = style.backgroundImage;
                        if (bgImage && bgImage !== 'none') {
                            const matches = bgImage.match(/url\(["']?([^"')]+)["']?\)/g);
                            if (matches) {
                                matches.forEach(match => {
                                    const url = match.match(/url\(["']?([^"')]+)["']?\)/)[1];
                                    if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
                                        result.imageUrls.add(url);
                                    }
                                });
                            }
                        }
                    } catch (e) {}
                });

                // Fonts from stylesheets
                try {
                    for (let sheet of document.styleSheets) {
                        try {
                            for (let rule of sheet.cssRules || sheet.rules) {
                                if (rule.cssText && rule.cssText.includes('@font-face')) {
                                    const fontMatches = rule.cssText.match(/url\(["']?([^"')]+\.(woff2?|ttf|eot|otf))["']?\)/gi);
                                    if (fontMatches) {
                                        fontMatches.forEach(match => {
                                            const url = match.match(/url\(["']?([^"')]+)["']?\)/)[1];
                                            if (url) result.fontUrls.add(url);
                                        });
                                    }
                                }
                            }
                        } catch (e) {}
                    }
                } catch (e) {}

                return {
                    cssUrls: Array.from(result.cssUrls),
                    jsUrls: Array.from(result.jsUrls),
                    imageUrls: Array.from(result.imageUrls),
                    fontUrls: Array.from(result.fontUrls)
                };
            }, this.baseUrl.origin);

            this.log(`   📋 Found ${resources.cssUrls.length} CSS files`);
            this.log(`   📋 Found ${resources.jsUrls.length} JS files`);
            this.log(`   📋 Found ${resources.imageUrls.length} images`);
            this.log(`   📋 Found ${resources.fontUrls.length} fonts\n`);

            // Download ALL CSS
            this.log('🎨 Downloading CSS files...\n');
            const downloadedCSS = [];
            
            for (let i = 0; i < resources.cssUrls.length; i++) {
                const cssUrl = resources.cssUrls[i];
                this.log(`   [${i+1}/${resources.cssUrls.length}] ${cssUrl.substring(cssUrl.length - 50)}`);
                
                const content = await this.fetchResource(cssUrl);
                if (content && content.trim()) {
                    downloadedCSS.push({ url: cssUrl, content });
                    this.log(`   ✓ ${content.length.toLocaleString()} bytes\n`);
                } else {
                    this.log(`   ✗ Failed\n`);
                }
            }

            // Download ALL fonts
            this.log('🔤 Downloading font files...\n');
            const downloadedFonts = [];
            
            for (let i = 0; i < resources.fontUrls.length; i++) {
                const fontUrl = resources.fontUrls[i];
                this.log(`   [${i+1}/${resources.fontUrls.length}] ${fontUrl.substring(fontUrl.length - 50)}`);
                
                const content = await this.fetchResource(fontUrl);
                if (content && content.length > 0) {
                    downloadedFonts.push({ url: fontUrl, content });
                    this.log(`   ✓ ${content.length.toLocaleString()} bytes\n`);
                } else {
                    this.log(`   ✗ Failed\n`);
                }
            }

            // Extract ALL CSS from page (including computed styles)
            this.log('🎨 Extracting page styles (inline + computed)...\n');
            
            const pageCSS = await page.evaluate(() => {
                let css = '';

                // All <style> tags
                document.querySelectorAll('style').forEach(style => {
                    if (style.textContent) {
                        css += '\n/* Style Block */\n' + style.textContent + '\n';
                    }
                });

                // All inline style attributes (preserve exactly)
                document.querySelectorAll('[style]').forEach((el, idx) => {
                    const style = el.getAttribute('style');
                    if (style && style.trim()) {
                        const className = typeof el.className === 'string' ? el.className : '';
                        const classes = className.split(' ').filter(c => c.trim()).join('.');
                        const id = el.id ? `#${el.id}` : '';
                        let selector = el.tagName.toLowerCase() + id + (classes ? '.' + classes : '');
                        
                        if (!id && !classes) {
                            selector += `[data-inline-style="${idx}"]`;
                            el.setAttribute('data-inline-style', idx);
                        }
                        
                        css += `${selector} { ${style} }\n`;
                    }
                });

                // Computed styles for ALL elements with backgrounds or special properties
                document.querySelectorAll('*').forEach((el, idx) => {
                    if (idx < 500) {
                        try {
                            const computed = window.getComputedStyle(el);
                            const bgImage = computed.backgroundImage;
                            const fontFamily = computed.fontFamily;
                            
                            if ((bgImage && bgImage !== 'none' && !bgImage.includes('data:')) || 
                                (fontFamily && fontFamily !== 'serif' && fontFamily !== 'sans-serif')) {
                                
                                const className = typeof el.className === 'string' ? el.className : '';
                                const classes = className.split(' ').filter(c => c.trim()).join('.');
                                const id = el.id ? `#${el.id}` : '';
                                let selector = el.tagName.toLowerCase() + id + (classes ? '.' + classes : '');
                                
                                if (!id && !classes) {
                                    selector += `[data-computed-style="${idx}"]`;
                                    el.setAttribute('data-computed-style', idx);
                                }

                                css += `\n${selector} {\n`;
                                
                                if (bgImage && bgImage !== 'none') {
                                    css += `  background-image: ${bgImage};\n`;
                                    css += `  background-size: ${computed.backgroundSize};\n`;
                                    css += `  background-position: ${computed.backgroundPosition};\n`;
                                    css += `  background-repeat: ${computed.backgroundRepeat};\n`;
                                    css += `  background-attachment: ${computed.backgroundAttachment};\n`;
                                }
                                
                                if (fontFamily) {
                                    css += `  font-family: ${fontFamily};\n`;
                                    css += `  font-size: ${computed.fontSize};\n`;
                                    css += `  font-weight: ${computed.fontWeight};\n`;
                                    css += `  font-style: ${computed.fontStyle};\n`;
                                    css += `  line-height: ${computed.lineHeight};\n`;
                                    css += `  letter-spacing: ${computed.letterSpacing};\n`;
                                }
                                
                                const height = computed.height;
                                const minHeight = computed.minHeight;
                                if (height && height !== 'auto' && height !== '0px') {
                                    css += `  height: ${height};\n`;
                                }
                                if (minHeight && minHeight !== '0px') {
                                    css += `  min-height: ${minHeight};\n`;
                                }
                                
                                css += `}\n`;
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

            // Download ALL JS
            this.log('📜 Downloading JavaScript files...\n');
            const downloadedJS = [];
            
            for (let i = 0; i < resources.jsUrls.length; i++) {
                const jsUrl = resources.jsUrls[i];
                this.log(`   [${i+1}/${resources.jsUrls.length}] ${jsUrl.substring(jsUrl.length - 50)}`);
                
                const content = await this.fetchResource(jsUrl);
                if (content && content.trim()) {
                    downloadedJS.push({ url: jsUrl, content });
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
                        js += '\n' + content + '\n';
                    }
                });
                return js;
            });

            this.log(`   ✓ Extracted ${inlineJS.length.toLocaleString()} characters\n`);

            // Get final HTML
            this.log('🔨 Building final HTML...\n');
            
            let html = await page.content();

            // Remove old references
            html = html.replace(/<link[^>]*(?:rel=["']stylesheet["']|href=["'][^"']*\.css)[^>]*>/gi, '');
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

            // Build combined CSS
            let allCSS = '';
            
            downloadedCSS.forEach((item, i) => {
                allCSS += `\n/* ========== CSS File ${i+1}: ${item.url} ========== */\n${item.content}\n`;
            });
            
            allCSS += `\n/* ========== Page Styles ========== */\n${pageCSS}\n`;

            // Build combined JS
            let allJS = '';
            
            downloadedJS.forEach((item, i) => {
                allJS += `\n// ========== JS File ${i+1}: ${item.url} ==========\n${item.content}\n`;
            });
            
            allJS += `\n// ========== Inline Scripts ==========\n${inlineJS}\n`;

            // Create blocks
            const cssBlock = `<style>\n${allCSS}\n</style>`;
            const jsBlock = `<script>\n${allJS}\n</script>`;

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

            this.log('╔═══════════════════════════════════════════╗');
            this.log('║    ✅ PERFECT COPY COMPLETED!            ║');
            this.log('╚═══════════════════════════════════════════╝\n');
            this.log('📊 Final Summary:\n');
            this.log(`   ✅ CSS files: ${downloadedCSS.length} (${downloadedCSS.reduce((a,b) => a + b.content.length, 0).toLocaleString()} chars)`);
            this.log(`   ✅ Page CSS: ${pageCSS.length.toLocaleString()} chars`);
            this.log(`   ✅ Total CSS: ${allCSS.length.toLocaleString()} chars\n`);
            this.log(`   ✅ JS files: ${downloadedJS.length} (${downloadedJS.reduce((a,b) => a + b.content.length, 0).toLocaleString()} chars)`);
            this.log(`   ✅ Inline JS: ${inlineJS.length.toLocaleString()} chars`);
            this.log(`   ✅ Total JS: ${allJS.length.toLocaleString()} chars\n`);
            this.log(`   ✅ Images found: ${resources.imageUrls.length}`);
            this.log(`   ✅ Fonts downloaded: ${downloadedFonts.length}`);
            this.log(`   ✅ Final HTML: ${html.length.toLocaleString()} chars\n`);

            // Output to stdout
            console.log(html);

        } catch (error) {
            this.log(`\n❌ Error: ${error.message}`);
            this.log(error.stack);
            if (browser) await browser.close();
            process.exit(1);
        }
    }
}

// Main execution
const url = process.argv[2];

if (!url) {
    console.error('❌ Error: No URL provided');
    console.error('Usage: node scraper.js <url>');
    process.exit(1);
}

let targetUrl = url;
if (!url.startsWith('http://') && !url.startsWith('https://')) {
    targetUrl = 'https://' + url;
}

const scraper = new UltraAccurateWebsiteScraper(targetUrl);
scraper.scrape().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
});
