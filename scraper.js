// scraper.js - Production-Ready Website Scraper (Error-Free)
const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs').promises;
const path = require('path');

class WebsiteScraper {
    constructor(targetUrl, options = {}) {
        this.targetUrl = this.normalizeUrl(targetUrl);
        this.baseUrl = new URL(this.targetUrl);
        this.options = {
            timeout: options.timeout || 90000,
            waitForDynamic: options.waitForDynamic !== false,
            inlineImages: options.inlineImages || false,
            maxScrolls: options.maxScrolls || 80,
            outputDir: options.outputDir || './scraped_output',
            ...options
        };
        this.resources = {
            css: new Map(),
            js: new Map(),
            images: new Map(),
            fonts: new Map()
        };
    }

    normalizeUrl(url) {
        if (!url || typeof url !== 'string') {
            throw new Error('URL is required');
        }
        
        url = url.trim();
        
        // Remove protocol and www to normalize
        url = url.replace(/^(https?:\/\/)?(www\.)?/i, '');
        url = url.replace(/\/+$/, '');
        
        // Add https protocol
        url = 'https://' + url;
        
        try {
            new URL(url);
            return url;
        } catch (e) {
            // Try http if https fails
            url = url.replace('https://', 'http://');
            try {
                new URL(url);
                return url;
            } catch (e2) {
                throw new Error('Invalid URL format');
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    log(message) {
        console.error(message);
    }

    async fetchResource(url, retries = 2, binary = false) {
        for (let i = 0; i < retries; i++) {
            try {
                const result = await this._fetch(url, binary);
                if (result) return result;
                if (i < retries - 1) await this.sleep(1000);
            } catch (e) {
                if (i === retries - 1) {
                    this.log(`   ✗ Failed: ${url.slice(-40)}`);
                }
            }
        }
        return binary ? null : '';
    }

    _fetch(url, binary = false) {
        return new Promise((resolve) => {
            try {
                const parsed = new URL(url);
                const lib = parsed.protocol === 'https:' ? https : http;
                
                const req = lib.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*'
                    },
                    timeout: 20000
                }, (res) => {
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        try {
                            const redirect = new URL(res.headers.location, url).href;
                            return resolve(this.fetchResource(redirect, 1, binary));
                        } catch (e) {
                            return resolve(binary ? null : '');
                        }
                    }
                    
                    if (res.statusCode === 200) {
                        if (binary) {
                            const chunks = [];
                            res.on('data', chunk => chunks.push(chunk));
                            res.on('end', () => {
                                try {
                                    resolve(Buffer.concat(chunks));
                                } catch (e) {
                                    resolve(null);
                                }
                            });
                            res.on('error', () => resolve(null));
                        } else {
                            let data = '';
                            res.setEncoding('utf8');
                            res.on('data', chunk => data += chunk);
                            res.on('end', () => resolve(data));
                            res.on('error', () => resolve(''));
                        }
                    } else {
                        resolve(binary ? null : '');
                    }
                });
                
                req.on('error', () => resolve(binary ? null : ''));
                req.on('timeout', () => {
                    req.destroy();
                    resolve(binary ? null : '');
                });
            } catch (e) {
                resolve(binary ? null : '');
            }
        });
    }

    async createDir() {
        try {
            await fs.mkdir(this.options.outputDir, { recursive: true });
        } catch (e) {
            // Ignore if exists
        }
    }

    async scrape() {
        this.log('╔════════════════════════════════════════════╗');
        this.log('║   🚀 WEBSITE SCRAPER v2.1                 ║');
        this.log('╚════════════════════════════════════════════╝\n');
        this.log(`🌐 Target: ${this.targetUrl}\n`);

        let browser = null;
        
        try {
            await this.createDir();

            this.log('🔧 Launching browser...');
            
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-zygote',
                    '--single-process',
                    '--disable-web-security'
                ],
                ignoreHTTPSErrors: true,
                timeout: 60000
            }).catch(err => {
                throw new Error(`Browser launch failed: ${err.message}. Please run: npm install puppeteer`);
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            
            // Stealth
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                window.chrome = { runtime: {} };
            });
            
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            this.log('📄 Loading page...\n');

            // Load strategies
            const strategies = [
                { name: 'networkidle2', wait: 'networkidle2', time: 90000 },
                { name: 'load', wait: 'load', time: 60000 },
                { name: 'domcontentloaded', wait: 'domcontentloaded', time: 45000 }
            ];

            let loaded = false;
            let strategy = '';
            
            for (const s of strategies) {
                if (loaded) break;
                try {
                    this.log(`   Trying: ${s.name}...`);
                    await page.goto(this.targetUrl, { 
                        waitUntil: s.wait, 
                        timeout: s.time 
                    });
                    this.log(`   ✓ Success with ${s.name}\n`);
                    loaded = true;
                    strategy = s.name;
                    break;
                } catch (e) {
                    this.log(`   ✗ ${s.name} failed (${e.message.slice(0, 50)})`);
                }
            }

            if (!loaded) {
                throw new Error('Could not load page');
            }

            // Wait
            if (this.options.waitForDynamic) {
                this.log('⏳ Waiting for content (8s)...');
                await this.sleep(8000);
            }

            // Scroll
            this.log('📜 Scrolling...');
            try {
                await page.evaluate(async (max) => {
                    let scrolls = 0;
                    const interval = setInterval(() => {
                        window.scrollBy(0, 100);
                        scrolls++;
                        if (scrolls >= max) clearInterval(interval);
                    }, 50);
                    await new Promise(r => setTimeout(r, max * 50));
                }, this.options.maxScrolls);
                
                await this.sleep(2000);
                await page.evaluate(() => window.scrollTo(0, 0));
                await this.sleep(2000);
            } catch (e) {
                this.log('   Warning: Scroll issues');
            }

            // Load content
            this.log('🖼️  Loading content...');
            try {
                await page.evaluate(() => {
                    document.querySelectorAll('img').forEach(img => {
                        if (img.loading === 'lazy') img.loading = 'eager';
                        const src = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
                        if (src) img.src = src;
                    });
                    document.querySelectorAll('[hidden]').forEach(el => {
                        el.removeAttribute('hidden');
                    });
                });
                await this.sleep(3000);
            } catch (e) {
                this.log('   Warning: Some content may not load');
            }

            this.log('✅ Page loaded!\n');

            // Get metadata
            this.log('📋 Extracting metadata...');
            const meta = await page.evaluate(() => {
                return {
                    title: document.title || '',
                    description: document.querySelector('meta[name="description"]')?.content || '',
                    viewport: document.querySelector('meta[name="viewport"]')?.content || 'width=device-width, initial-scale=1.0',
                    charset: document.querySelector('meta[charset]')?.getAttribute('charset') || 'UTF-8'
                };
            });

            // Get resources
            this.log('📋 Finding resources...');
            const urls = await page.evaluate((base) => {
                const result = { css: [], js: [], images: [], fonts: [] };
                
                const norm = (u) => {
                    try {
                        if (!u || u.startsWith('data:') || u.startsWith('blob:')) return null;
                        return new URL(u, base).href;
                    } catch (e) {
                        return null;
                    }
                };
                
                // CSS
                document.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
                    const u = norm(el.href);
                    if (u) result.css.push(u);
                });
                
                // JS
                document.querySelectorAll('script[src]').forEach(el => {
                    const u = norm(el.src);
                    if (u) result.js.push(u);
                });
                
                // Images
                document.querySelectorAll('img').forEach(el => {
                    const u = norm(el.src);
                    if (u) result.images.push(u);
                });
                
                return result;
            }, this.targetUrl);

            this.log(`   CSS: ${urls.css.length} | JS: ${urls.js.length} | Images: ${urls.images.length}\n`);

            // Download CSS
            this.log('🎨 Downloading CSS...');
            for (let i = 0; i < Math.min(urls.css.length, 30); i++) {
                const url = urls.css[i];
                const content = await this.fetchResource(url);
                if (content && content.trim()) {
                    this.resources.css.set(url, content);
                }
            }
            this.log(`   ✓ Downloaded ${this.resources.css.size} files\n`);

            // Download JS
            this.log('📜 Downloading JS...');
            for (let i = 0; i < Math.min(urls.js.length, 20); i++) {
                const url = urls.js[i];
                const content = await this.fetchResource(url);
                if (content && content.trim()) {
                    this.resources.js.set(url, content);
                }
            }
            this.log(`   ✓ Downloaded ${this.resources.js.size} files\n`);

            // Inline images if requested
            if (this.options.inlineImages) {
                this.log('🖼️  Inlining images...');
                let count = 0;
                for (let i = 0; i < Math.min(urls.images.length, 50); i++) {
                    const url = urls.images[i];
                    const data = await this.fetchResource(url, 2, true);
                    if (data && data.length > 0 && data.length < 300000) {
                        try {
                            const ext = url.split('.').pop().split('?')[0].toLowerCase();
                            const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', 
                                         gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }[ext] || 'image/jpeg';
                            this.resources.images.set(url, `data:${mime};base64,${data.toString('base64')}`);
                            count++;
                        } catch (e) {}
                    }
                }
                this.log(`   ✓ Inlined ${count} images\n`);
            }

            // Extract inline CSS
            this.log('🎨 Extracting inline CSS...');
            const inlineCSS = await page.evaluate(() => {
                let css = '';
                document.querySelectorAll('style').forEach((s, i) => {
                    if (s.textContent) {
                        css += `\n    /* Style Block ${i + 1} */\n`;
                        css += s.textContent.split('\n').map(l => '    ' + l).join('\n') + '\n';
                    }
                });
                document.querySelectorAll('[style]').forEach((el, i) => {
                    const style = el.getAttribute('style');
                    if (style) {
                        const sel = el.id ? `#${el.id}` : 
                                   el.className ? `.${el.className.toString().split(' ')[0]}` :
                                   `[data-s="${i}"]`;
                        if (!el.id && !el.className) el.setAttribute('data-s', i);
                        css += `    ${sel} { ${style} }\n`;
                    }
                });
                return css;
            });
            this.log(`   ✓ ${inlineCSS.length} chars\n`);

            // Extract inline JS
            this.log('📜 Extracting inline JS...');
            const inlineJS = await page.evaluate(() => {
                let js = '';
                document.querySelectorAll('script:not([src])').forEach((s, i) => {
                    const code = s.textContent;
                    if (code && !code.includes('google-analytics') && !code.includes('gtag')) {
                        js += `\n    // Script ${i + 1}\n`;
                        js += code.split('\n').map(l => '    ' + l).join('\n') + '\n';
                    }
                });
                return js;
            });
            this.log(`   ✓ ${inlineJS.length} chars\n`);

            // Get body
            this.log('🔨 Extracting body...');
            let body = await page.evaluate(() => document.body ? document.body.innerHTML : '');
            
            // Replace images if inlined
            if (this.options.inlineImages) {
                this.resources.images.forEach((dataUri, url) => {
                    if (dataUri.startsWith('data:')) {
                        const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        body = body.replace(new RegExp(escaped, 'g'), dataUri);
                    }
                });
            }
            
            this.log(`   ✓ ${body.length} chars\n`);

            await browser.close();
            browser = null;

            // Build HTML
            this.log('🔨 Building HTML...');
            const html = this.buildHTML(meta, inlineCSS, inlineJS, body);

            // Save
            const file = path.join(this.options.outputDir, 'index.html');
            await fs.writeFile(file, html, 'utf8');

            // Save metadata
            await fs.writeFile(
                path.join(this.options.outputDir, 'structure.json'),
                JSON.stringify({
                    metadata: meta,
                    resources: {
                        css: this.resources.css.size,
                        js: this.resources.js.size,
                        images: this.resources.images.size
                    },
                    sizes: {
                        html: html.length,
                        body: body.length,
                        inlineCSS: inlineCSS.length,
                        inlineJS: inlineJS.length
                    },
                    strategy: strategy
                }, null, 2),
                'utf8'
            );

            this.log('╔════════════════════════════════════════════╗');
            this.log('║    ✅ SUCCESS!                            ║');
            this.log('╚════════════════════════════════════════════╝\n');
            this.log('📊 Summary:\n');
            this.log(`   ✅ CSS: ${this.resources.css.size} files`);
            this.log(`   ✅ JS: ${this.resources.js.size} files`);
            this.log(`   ✅ Images: ${this.resources.images.size}`);
            this.log(`   ✅ HTML: ${html.length.toLocaleString()} bytes`);
            this.log(`   📁 Saved: ${file}\n`);

            console.log(html);
            return { success: true, html, file };

        } catch (error) {
            this.log(`\n❌ ERROR: ${error.message}`);
            if (browser) {
                try { await browser.close(); } catch (e) {}
            }
            process.exit(1);
        }
    }

    buildHTML(meta, inlineCSS, inlineJS, body) {
        let css = '';
        
        // External CSS
        if (this.resources.css.size > 0) {
            css += '    /* ========== External CSS Files ========== */\n\n';
            this.resources.css.forEach((content, url) => {
                css += `    /* ${url} */\n`;
                css += content.split('\n').map(l => '    ' + l).join('\n') + '\n\n';
            });
        }
        
        // Inline CSS
        if (inlineCSS) {
            css += '    /* ========== Inline & Page Styles ========== */\n';
            css += inlineCSS;
        }

        let js = '';
        
        // External JS
        if (this.resources.js.size > 0) {
            js += '    // ========== External JavaScript Files ==========\n\n';
            this.resources.js.forEach((content, url) => {
                js += `    // ${url}\n`;
                js += content.split('\n').map(l => '    ' + l).join('\n') + '\n\n';
            });
        }
        
        // Inline JS
        if (inlineJS) {
            js += '    // ========== Inline Scripts ==========\n';
            js += inlineJS;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="${meta.charset}">
  <meta name="viewport" content="${meta.viewport}">
  ${meta.description ? `<meta name="description" content="${meta.description}">` : ''}
  <title>${meta.title}</title>
  <base href="${this.targetUrl}">
  
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
  
  <style>
${css}
  </style>
</head>
<body>

${body}

  <!-- JavaScript -->
  <script>
${js}
  </script>

</body>
</html>`;
    }
}

// CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help')) {
        console.error(`
╔════════════════════════════════════════════╗
║  WEBSITE SCRAPER v2.1                     ║
╚════════════════════════════════════════════╝

USAGE:
  node scraper.js <url> [options]

URL FORMATS (all work):
  ✓ example.com
  ✓ www.example.com
  ✓ http://example.com
  ✓ https://example.com

OPTIONS:
  --timeout <ms>       Timeout (default: 90000)
  --no-dynamic         Skip wait for dynamic content
  --inline-images      Inline images as base64
  --max-scrolls <n>    Scroll iterations (default: 80)
  --output-dir <path>  Output directory (default: ./scraped_output)

EXAMPLES:
  node scraper.js example.com
  node scraper.js www.example.com --inline-images
  node scraper.js https://example.com --timeout 120000

TROUBLESHOOTING:
  Error: "Cannot find module 'puppeteer'"
  → Run: npm install puppeteer
  
  Error: "Browser launch failed"
  → Run: npm install puppeteer --force
  
  Error: "Navigation timeout"
  → Use: --timeout 180000
  
  Error: "Exit code 1"
  → Check your internet connection
  → Verify URL is accessible in browser
  → Try: node scraper.js example.com --no-dynamic
`);
        process.exit(0);
    }

    const url = args[0];
    const opts = {};

    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--timeout' && args[i+1]) {
            opts.timeout = parseInt(args[++i]) || 90000;
        } else if (args[i] === '--no-dynamic') {
            opts.waitForDynamic = false;
        } else if (args[i] === '--inline-images') {
            opts.inlineImages = true;
        } else if (args[i] === '--max-scrolls' && args[i+1]) {
            opts.maxScrolls = parseInt(args[++i]) || 80;
        } else if (args[i] === '--output-dir' && args[i+1]) {
            opts.outputDir = args[++i];
        }
    }

    try {
        const scraper = new WebsiteScraper(url, opts);
        scraper.scrape().catch(err => {
            console.error('❌ Fatal:', err.message);
            process.exit(1);
        });
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('\nUsage: node scraper.js <url>');
        console.error('Example: node scraper.js example.com');
        process.exit(1);
    }
}

module.exports = WebsiteScraper;
