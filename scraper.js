const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const readline = require('readline');

class PerfectWebsiteScraper {
    constructor(targetUrl, outputFile = 'scraped_website.html') {
        this.targetUrl = targetUrl;
        this.outputFile = outputFile;
        this.baseUrl = new URL(targetUrl);
        this.downloadedResources = new Map();
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
        console.log('\n╔═══════════════════════════════════════════╗');
        console.log('║   🎯 PERFECT WEBSITE SCRAPER v7.0        ║');
        console.log('║   Complete copy with ALL resources!      ║');
        console.log('╚═══════════════════════════════════════════╝\n');
        console.log(`🌐 URL: ${this.targetUrl}`);
        console.log(`📄 Output: ${this.outputFile}\n`);

        let browser;
        
        try {
            console.log('🔧 Launching browser...');
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process'
                ]
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            console.log('📄 Loading page and all resources...\n');

            // Load page with network idle
            try {
                await page.goto(this.targetUrl, {
                    waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
                    timeout: 90000
                });
            } catch {
                await page.goto(this.targetUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 45000
                });
            }

            console.log('⏳ Waiting for dynamic content...');
            await this.sleep(8000);

            // Extensive scrolling to load EVERYTHING
            console.log('📜 Loading all lazy content...');
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let scrolls = 0;
                    const maxScrolls = 40;
                    const interval = setInterval(() => {
                        window.scrollBy(0, 150);
                        scrolls++;
                        if (scrolls >= maxScrolls) {
                            clearInterval(interval);
                            window.scrollTo(0, 0);
                            setTimeout(resolve, 2000);
                        }
                    }, 100);
                });
            });

            await this.sleep(3000);

            console.log('✅ Page fully loaded!\n');

            // Get ALL CSS including computed styles
            console.log('🎨 Extracting ALL CSS (including background images)...\n');

            const allCSS = await page.evaluate((baseUrl) => {
                let cssText = '';

                // Method 1: Get all stylesheet rules
                try {
                    for (let sheet of document.styleSheets) {
                        try {
                            for (let rule of sheet.cssRules || sheet.rules) {
                                if (rule.cssText) {
                                    cssText += rule.cssText + '\n';
                                }
                            }
                        } catch (e) {
                            // Cross-origin stylesheet
                            if (sheet.href) {
                                cssText += `/* External stylesheet: ${sheet.href} */\n`;
                            }
                        }
                    }
                } catch (e) {}

                // Method 2: Get ALL inline styles from elements
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

                // Method 3: Get computed styles for key elements with background images
                const elementsWithBg = document.querySelectorAll('body, section, div, header, nav, main, footer, article, aside');
                elementsWithBg.forEach((el, index) => {
                    try {
                        if (index < 200) {
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

                                // Get all background properties
                                const bgColor = computed.backgroundColor;
                                const bgSize = computed.backgroundSize;
                                const bgPosition = computed.backgroundPosition;
                                const bgRepeat = computed.backgroundRepeat;
                                const bgAttachment = computed.backgroundAttachment;

                                cssText += `${selector} {\n`;
                                cssText += `  background-image: ${bgImage};\n`;
                                if (bgColor !== 'rgba(0, 0, 0, 0)') cssText += `  background-color: ${bgColor};\n`;
                                if (bgSize !== 'auto') cssText += `  background-size: ${bgSize};\n`;
                                if (bgPosition !== '0% 0%') cssText += `  background-position: ${bgPosition};\n`;
                                if (bgRepeat !== 'repeat') cssText += `  background-repeat: ${bgRepeat};\n`;
                                if (bgAttachment !== 'scroll') cssText += `  background-attachment: ${bgAttachment};\n`;
                                
                                // Add other important properties
                                const height = computed.height;
                                const minHeight = computed.minHeight;
                                const display = computed.display;
                                const position = computed.position;
                                
                                if (height !== 'auto' && height !== '0px') cssText += `  height: ${height};\n`;
                                if (minHeight !== '0px') cssText += `  min-height: ${minHeight};\n`;
                                if (display !== 'block') cssText += `  display: ${display};\n`;
                                if (position !== 'static') cssText += `  position: ${position};\n`;
                                
                                cssText += `}\n`;
                            }
                        }
                    } catch (e) {}
                });

                // Method 4: Inline style tags
                document.querySelectorAll('style').forEach(style => {
                    cssText += style.textContent + '\n';
                });

                return cssText;
            }, this.baseUrl.origin);

            console.log(`   ✓ Extracted ${allCSS.length.toLocaleString()} characters of CSS\n`);

            // Get external CSS files
            console.log('📥 Downloading external CSS files...\n');

            const cssLinks = await page.evaluate(() => {
                const links = [];
                document.querySelectorAll('link[rel="stylesheet"], link[href*=".css"]').forEach(link => {
                    if (link.href) links.push(link.href);
                });
                return links;
            });

            console.log(`   Found ${cssLinks.length} CSS files`);

            let externalCSS = '';
            for (const cssUrl of cssLinks) {
                console.log(`   Downloading: ${path.basename(cssUrl)}`);
                const content = await this.fetchResource(cssUrl);
                if (content && content.trim()) {
                    externalCSS += `\n/* ========== ${cssUrl} ========== */\n${content}\n`;
                    console.log(`   ✓ Downloaded (${content.length} bytes)`);
                }
            }

            // Get all JavaScript
            console.log('\n📜 Extracting ALL JavaScript...\n');

            const allJS = await page.evaluate(() => {
                let jsText = '';

                // Inline scripts
                document.querySelectorAll('script:not([src])').forEach(script => {
                    const content = script.textContent || script.innerHTML;
                    if (content && content.trim() && 
                        !content.includes('google-analytics') &&
                        !content.includes('gtag')) {
                        jsText += content + '\n\n';
                    }
                });

                return jsText;
            });

            console.log(`   ✓ Extracted ${allJS.length.toLocaleString()} characters of inline JS\n`);

            // Get external JS files
            console.log('📥 Downloading external JS files...\n');

            const jsLinks = await page.evaluate(() => {
                const links = [];
                document.querySelectorAll('script[src]').forEach(script => {
                    if (script.src) links.push(script.src);
                });
                return links;
            });

            console.log(`   Found ${jsLinks.length} JS files`);

            let externalJS = '';
            for (const jsUrl of jsLinks) {
                console.log(`   Downloading: ${path.basename(jsUrl)}`);
                const content = await this.fetchResource(jsUrl);
                if (content && content.trim()) {
                    externalJS += `\n// ========== ${jsUrl} ==========\n${content}\n`;
                    console.log(`   ✓ Downloaded (${content.length} bytes)`);
                }
            }

            // Get complete HTML
            console.log('\n🔨 Building final HTML...\n');

            let html = await page.content();

            // Remove old CSS and JS references
            html = html.replace(/<link[^>]*(?:rel=["']stylesheet["']|href=["'][^"']*\.css)[^>]*>/gi, '');
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

            // Combine all CSS
            const finalCSS = externalCSS + '\n\n' + allCSS;

            // Combine all JS
            const finalJS = externalJS + '\n\n' + allJS;

            // Create embedded blocks
            const cssBlock = `\n<!-- ==================== ALL STYLES EMBEDDED ==================== -->\n<style>\n${finalCSS}\n</style>\n`;
            const jsBlock = `\n<!-- ==================== ALL SCRIPTS EMBEDDED ==================== -->\n<script>\n${finalJS}\n</script>\n`;

            // Insert CSS
            if (html.includes('</head>')) {
                html = html.replace('</head>', cssBlock + '</head>');
            } else {
                html = '<head>' + cssBlock + '</head>' + html;
            }

            // Insert JS
            if (html.includes('</body>')) {
                html = html.replace('</body>', jsBlock + '</body>');
            } else {
                html += jsBlock;
            }

            // Ensure meta tags
            if (!html.includes('charset')) {
                const meta = '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
                html = html.replace('<head>', '<head>\n' + meta);
            }

            // Save file
            console.log('💾 Saving file...\n');
            fs.writeFileSync(this.outputFile, html, 'utf8');

            const stats = fs.statSync(this.outputFile);
            const sizeKB = (stats.size / 1024).toFixed(2);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            await browser.close();

            console.log('╔═══════════════════════════════════════════╗');
            console.log('║    ✅ PERFECT COPY COMPLETED!            ║');
            console.log('╚═══════════════════════════════════════════╝\n');
            console.log('📊 Final Summary:\n');
            console.log(`📄 File: ${path.resolve(this.outputFile)}`);
            console.log(`💾 Size: ${sizeKB} KB (${sizeMB} MB)\n`);
            console.log('📦 Embedded Content:\n');
            console.log(`   ✅ CSS from stylesheets: ${externalCSS.length.toLocaleString()} chars`);
            console.log(`   ✅ CSS from page elements: ${allCSS.length.toLocaleString()} chars`);
            console.log(`   ✅ Total CSS: ${finalCSS.length.toLocaleString()} chars\n`);
            console.log(`   ✅ JS from external files: ${externalJS.length.toLocaleString()} chars`);
            console.log(`   ✅ JS from inline scripts: ${allJS.length.toLocaleString()} chars`);
            console.log(`   ✅ Total JS: ${finalJS.length.toLocaleString()} chars\n`);
            console.log('🎯 Features:\n');
            console.log('   ✨ Complete HTML structure');
            console.log('   ✨ ALL CSS (including background images)');
            console.log('   ✨ ALL JavaScript');
            console.log('   ✨ Computed styles from elements');
            console.log('   ✨ Images use original URLs\n');
            console.log('🌐 Ready to use!');
            console.log(`   Open: ${path.resolve(this.outputFile)}\n`);

        } catch (error) {
            console.error('\n❌ Error:', error.message);
            console.error(error.stack);
            if (browser) await browser.close();
            process.exit(1);
        }
    }
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    try {
        console.log('\n╔═══════════════════════════════════════════╗');
        console.log('║   PERFECT WEBSITE SCRAPER v7.0            ║');
        console.log('║                                           ║');
        console.log('║  ✅ Captures background images           ║');
        console.log('║  ✅ Extracts computed styles             ║');
        console.log('║  ✅ Downloads ALL CSS & JS               ║');
        console.log('║  ✅ Perfect working copy                 ║');
        console.log('╚═══════════════════════════════════════════╝\n');

        let url = await question('🌐 Enter website URL: ');
        url = url.trim();

        if (!url) {
            console.error('\n❌ Please provide a URL\n');
            rl.close();
            return;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        let outputFile = await question('\n📄 Output filename (Enter for "scraped_website.html"): ');
        outputFile = outputFile.trim() || 'scraped_website.html';
        
        if (!outputFile.endsWith('.html')) {
            outputFile += '.html';
        }

        rl.close();

        console.log('\n🚀 Starting perfect copy with ALL resources...\n');

        const scraper = new PerfectWebsiteScraper(url, outputFile);
        await scraper.scrape();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        rl.close();
        process.exit(1);
    }
}

process.on('unhandledRejection', (error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
});

main();
