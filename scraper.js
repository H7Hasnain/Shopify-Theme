// scraper.js - Complete website scraper with full CSS/JS/Images support
const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class CompleteWebsiteScraper {
    constructor(targetUrl) {
        this.targetUrl = targetUrl;
        this.baseUrl = new URL(targetUrl);
        this.cssCache = new Map();
        this.jsCache = new Map();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(message) {
        console.error(message); // Log to stderr so stdout is clean for HTML
    }

    async fetchResource(url, retries = 3) {
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const content = await this._fetchAttempt(url);
                if (content) return content;
                await this.sleep(1000 * (attempt + 1));
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
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*',
                        'Referer': this.targetUrl,
                        'Accept-Encoding': 'identity'
                    },
                    timeout: 30000
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
        this.log('║   🎯 COMPLETE WEBSITE SCRAPER v8.0       ║');
        this.log('╚═══════════════════════════════════════════╝\n');
        this.log(`🌐 Target: ${this.targetUrl}\n`);

        let browser;
        
        try {
            this.log('🔧 Launching browser...');
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled'
                ]
            });

            const page = await browser.newPage();
            
            // Set viewport
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Set user agent
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            this.log('📄 Loading page with all resources...\n');

            // Multiple loading strategies
            let loaded = false;
            const strategies = [
                { name: 'Network Idle 0', waitUntil: 'networkidle0', timeout: 90000 },
                { name: 'Network Idle 2', waitUntil: 'networkidle2', timeout: 60000 },
                { name: 'Full Load', waitUntil: 'load', timeout: 45000 },
                { name: 'DOM Ready', waitUntil: 'domcontentloaded', timeout: 30000 }
            ];

            for (const strategy of strategies) {
                if (loaded) break;
                try {
                    this.log(`   Trying: ${strategy.name}...`);
                    await page.goto(this.targetUrl, { 
                        waitUntil: strategy.waitUntil, 
                        timeout: strategy.timeout 
                    });
                    this.log(`   ✓ Success with ${strategy.name}\n`);
                    loaded = true;
                } catch (e) {
                    this.log(`   ✗ ${strategy.name} failed`);
                }
            }

            if (!loaded) {
                throw new Error('Could not load page');
            }

            // Wait for dynamic content
            this.log('⏳ Waiting for dynamic content (10 seconds)...');
            await this.sleep(10000);

            // Extensive scrolling
            this.log('📜 Scrolling to load ALL content...');
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalScrolls = 0;
                    const maxScrolls = 50;
                    const scrollInterval = setInterval(() => {
                        const scrollHeight = document.documentElement.scrollHeight;
                        window.scrollBy(0, 150);
                        totalScrolls++;
                        
                        if (totalScrolls >= maxScrolls || window.scrollY + window.innerHeight >= scrollHeight) {
                            clearInterval(scrollInterval);
                            window.scrollTo(0, 0);
                            setTimeout(resolve, 2000);
                        }
                    }, 80);
                });
            });

            await this.sleep(3000);

            // Trigger interactive elements
            this.log('🔍 Triggering hidden elements...');
            await page.evaluate(() => {
                // Click dropdowns, tabs, etc.
                document.querySelectorAll('[role="tab"], .tab, .accordion, [data-toggle], [aria-expanded="false"]').forEach(el => {
                    try { el.click(); } catch (e) {}
                });
                
                // Trigger hover effects
                document.querySelectorAll('[data-hover], .dropdown, .menu-item').forEach(el => {
                    try {
                        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                    } catch (e) {}
                });
            });

            await this.sleep(2000);

            this.log('✅ Page fully loaded!\n');

            // STEP 1: Extract ALL resource URLs
            this.log('📋 Step 1: Extracting resource URLs...\n');
            
            const resources = await page.evaluate((baseOrigin) => {
                const result = {
                    cssUrls: new Set(),
                    jsUrls: new Set(),
                    imageUrls: new Set()
                };

                // Get CSS files
                document.querySelectorAll('link[rel="stylesheet"], link[href*=".css"]').forEach(link => {
                    if (link.href && !link.href.startsWith('data:')) {
                        result.cssUrls.add(link.href);
                    }
                });

                // Get JS files
                document.querySelectorAll('script[src]').forEach(script => {
                    if (script.src && !script.src.startsWith('data:')) {
                        result.jsUrls.add(script.src);
                    }
                });

                // Get image URLs
                document.querySelectorAll('img').forEach(img => {
                    [img.src, img.dataset.src, img.dataset.lazySrc].forEach(src => {
                        if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
                            result.imageUrls.add(src);
                        }
                    });

                    // srcset
                    if (img.srcset) {
                        img.srcset.split(',').forEach(srcset => {
                            const url = srcset.trim().split(' ')[0];
                            if (url && !url.startsWith('data:')) {
                                result.imageUrls.add(url);
                            }
                        });
                    }
                });

                return {
                    cssUrls: Array.from(result.cssUrls),
                    jsUrls: Array.from(result.jsUrls),
                    imageUrls: Array.from(result.imageUrls)
                };
            }, this.baseUrl.origin);

            this.log(`   CSS files: ${resources.cssUrls.length}`);
            this.log(`   JS files: ${resources.jsUrls.length}`);
            this.log(`   Images: ${resources.imageUrls.length}\n`);

            // STEP 2: Download ALL CSS files
            this.log('🎨 Step 2: Downloading CSS files...\n');
            let downloadedCSS = [];
            
            for (let i = 0; i < resources.cssUrls.length; i++) {
                const cssUrl = resources.cssUrls[i];
                this.log(`   [${i+1}/${resources.cssUrls.length}] ${cssUrl.substring(0, 60)}...`);
                
                const content = await this.fetchResource(cssUrl);
                if (content && content.trim()) {
                    downloadedCSS.push({
                        url: cssUrl,
                        content: content
                    });
                    this.log(`   ✓ Downloaded (${content.length} bytes)`);
                } else {
                    this.log(`   ✗ Failed`);
                }
            }

            // STEP 3: Extract ALL CSS from page
            this.log('\n🎨 Step 3: Extracting inline and computed CSS...\n');
            
            const pageCSS = await page.evaluate(() => {
                let css = '';

                // Get all <style> tags
                document.querySelectorAll('style').forEach(style => {
                    if (style.textContent) {
                        css += '\n/* Inline Style Block */\n' + style.textContent + '\n';
                    }
                });

                // Get all inline style attributes
                document.querySelectorAll('[style]').forEach((el, index) => {
                    try {
                        const style = el.getAttribute('style');
                        if (style) {
                            const className = typeof el.className === 'string' ? el.className : '';
                            const classes = className.split(' ').filter(c => c && c.trim()).join('.');
                            const id = el.id ? `#${el.id}` : '';
                            let selector = el.tagName.toLowerCase() + id + (classes ? '.' + classes : '');
                            
                            if (!id && !classes) {
                                selector += `[data-style-idx="${index}"]`;
                                el.setAttribute('data-style-idx', index);
                            }
                            
                            css += `${selector} { ${style} }\n`;
                        }
                    } catch (e) {}
                });

                // Get computed styles for elements with backgrounds
                document.querySelectorAll('*').forEach((el, index) => {
                    try {
                        if (index < 300) {
                            const computed = window.getComputedStyle(el);
                            const bgImage = computed.backgroundImage;
                            
                            if (bgImage && bgImage !== 'none' && !bgImage.includes('data:')) {
                                const className = typeof el.className === 'string' ? el.className : '';
                                const classes = className.split(' ').filter(c => c && c.trim()).join('.');
                                const id = el.id ? `#${el.id}` : '';
                                let selector = el.tagName.toLowerCase() + id + (classes ? '.' + classes : '');
                                
                                if (!id && !classes) {
                                    selector += `[data-bg-idx="${index}"]`;
                                    el.setAttribute('data-bg-idx', index);
                                }

                                css += `\n${selector} {\n`;
                                css += `  background-image: ${bgImage};\n`;
                                css += `  background-size: ${computed.backgroundSize};\n`;
                                css += `  background-position: ${computed.backgroundPosition};\n`;
                                css += `  background-repeat: ${computed.backgroundRepeat};\n`;
                                css += `  background-attachment: ${computed.backgroundAttachment};\n`;
                                
                                const height = computed.height;
                                const minHeight = computed.minHeight;
                                if (height !== 'auto' && height !== '0px') css += `  height: ${height};\n`;
                                if (minHeight !== '0px') css += `  min-height: ${minHeight};\n`;
                                
                                css += `}\n`;
                            }
                        }
                    } catch (e) {}
                });

                // Get all stylesheet rules
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

            // STEP 4: Download ALL JS files
            this.log('📜 Step 4: Downloading JavaScript files...\n');
            let downloadedJS = [];
            
            for (let i = 0; i < resources.jsUrls.length; i++) {
                const jsUrl = resources.jsUrls[i];
                this.log(`   [${i+1}/${resources.jsUrls.length}] ${jsUrl.substring(0, 60)}...`);
                
                const content = await this.fetchResource(jsUrl);
                if (content && content.trim()) {
                    downloadedJS.push({
                        url: jsUrl,
                        content: content
                    });
                    this.log(`   ✓ Downloaded (${content.length} bytes)`);
                } else {
                    this.log(`   ✗ Failed`);
                }
            }

            // STEP 5: Extract inline JS
            this.log('\n📜 Step 5: Extracting inline JavaScript...\n');
            
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

            // STEP 6: Get complete HTML
            this.log('🔨 Step 6: Extracting HTML structure...\n');
            
            const html = await page.content();

            // STEP 7: Build final HTML
            this.log('🔧 Step 7: Building final HTML...\n');

            let finalHTML = html;

            // Remove all old CSS and JS references
            finalHTML = finalHTML.replace(/<link[^>]*(?:rel=["']stylesheet["']|href=["'][^"']*\.css)[^>]*>/gi, '');
            finalHTML = finalHTML.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            finalHTML = finalHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

            // Combine all CSS
            let allCSS = '';
            
            // Add downloaded CSS
            downloadedCSS.forEach((item, i) => {
                allCSS += `\n/* ========== External CSS ${i+1}: ${item.url} ========== */\n`;
                allCSS += item.content + '\n';
            });
            
            // Add page CSS
            allCSS += '\n/* ========== Page Styles ========== */\n';
            allCSS += pageCSS;

            // Combine all JS
            let allJS = '';
            
            // Add downloaded JS
            downloadedJS.forEach((item, i) => {
                allJS += `\n// ========== External JS ${i+1}: ${item.url} ==========\n`;
                allJS += item.content + '\n';
            });
            
            // Add inline JS
            allJS += '\n// ========== Inline Scripts ==========\n';
            allJS += inlineJS;

            // Create embedded blocks
            const cssBlock = `\n<style>\n${allCSS}\n</style>\n`;
            const jsBlock = `\n<script>\n${allJS}\n</script>\n`;

            // Insert CSS before </head>
            if (finalHTML.includes('</head>')) {
                finalHTML = finalHTML.replace('</head>', cssBlock + '</head>');
            } else {
                finalHTML = '<head>' + cssBlock + '</head>' + finalHTML;
            }

            // Insert JS before </body>
            if (finalHTML.includes('</body>')) {
                finalHTML = finalHTML.replace('</body>', jsBlock + '</body>');
            } else {
                finalHTML += jsBlock;
            }

            // Ensure proper meta tags
            if (!finalHTML.includes('charset')) {
                const metaTags = '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta http-equiv="X-UA-Compatible" content="IE=edge">\n';
                finalHTML = finalHTML.replace('<head>', '<head>\n' + metaTags);
            }

            await browser.close();

            this.log('\n╔═══════════════════════════════════════════╗');
            this.log('║    ✅ SCRAPING COMPLETED!                ║');
            this.log('╚═══════════════════════════════════════════╝\n');
            this.log(`📊 Summary:\n`);
            this.log(`   CSS files downloaded: ${downloadedCSS.length}`);
            this.log(`   JS files downloaded: ${downloadedJS.length}`);
            this.log(`   Total CSS: ${allCSS.length.toLocaleString()} chars`);
            this.log(`   Total JS: ${allJS.length.toLocaleString()} chars`);
            this.log(`   Images found: ${resources.imageUrls.length}`);
            this.log(`   Final HTML size: ${finalHTML.length.toLocaleString()} chars\n`);

            // Output HTML to stdout
            console.log(finalHTML);

        } catch (error) {
            this.log(`\n❌ Error: ${error.message}`);
            this.log(error.stack);
            if (browser) await browser.close();
            process.exit(1);
        }
    }
}

// Get URL from command line
const url = process.argv[2];

if (!url) {
    console.error('❌ Error: No URL provided');
    console.error('Usage: node scraper.js <url>');
    process.exit(1);
}

// Validate URL
let targetUrl = url;
if (!url.startsWith('http://') && !url.startsWith('https://')) {
    targetUrl = 'https://' + url;
}

// Start scraping
const scraper = new CompleteWebsiteScraper(targetUrl);
scraper.scrape().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
});
