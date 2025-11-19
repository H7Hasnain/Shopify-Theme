// ============================================
// deepseek-bot.js - FIXED VERSION
// ============================================

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const delay = ms => new Promise(res => setTimeout(res, ms));

// Get credentials from environment variables
const email = process.env.DEEPSEEK_EMAIL || "hasnainnisar73@gmail.com";
const password = process.env.DEEPSEEK_PASSWORD || "Junaid@24290";
const userMessage = process.env.USER_MESSAGE || "Hello, how are you?";

console.log("🚀 Starting DeepSeek Automation...");
console.log(`📧 Email: ${email}`);
console.log(`💬 Message: ${userMessage}`);

(async () => {
    let browser;
    let result = {
        success: false,
        error: null,
        userMessage: userMessage,
        aiResponse: null,
        timestamp: new Date().toISOString()
    };

    try {
        // Launch browser
        console.log("\n🌐 Launching browser...");
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-extensions',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // ========== STEP 1: NAVIGATE TO LOGIN ==========
        console.log("\n📄 Step 1: Opening login page...");
        await page.goto("https://chat.deepseek.com/sign_in", {
            waitUntil: "networkidle2",
            timeout: 60000
        });
        await delay(3000);
        console.log("✅ Login page loaded");

        // Take screenshot
        try {
            await page.screenshot({ path: 'screenshot-login.png' });
        } catch (e) {
            console.log("Could not save screenshot:", e.message);
        }

        // ========== STEP 2: FILL EMAIL ==========
        console.log("\n✉️ Step 2: Filling email...");
        await page.waitForSelector('input[placeholder="Phone number / email address"]', { timeout: 10000 });
        await page.click('input[placeholder="Phone number / email address"]');
        await delay(500);
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.type('input[placeholder="Phone number / email address"]', email, { delay: 100 });
        console.log("✅ Email filled");

        // ========== STEP 3: FILL PASSWORD ==========
        console.log("\n🔐 Step 3: Filling password...");
        await page.waitForSelector('input[placeholder="Password"]', { timeout: 5000 });
        await page.click('input[placeholder="Password"]');
        await delay(500);
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.type('input[placeholder="Password"]', password, { delay: 100 });
        console.log("✅ Password filled");

        await delay(1000);

        // ========== STEP 4: CLICK LOGIN ==========
        console.log("\n🔘 Step 4: Clicking login button...");
        
        let loginSuccess = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!loginSuccess && retryCount < maxRetries) {
            retryCount++;
            console.log(`\n🔄 Attempt ${retryCount}/${maxRetries}...`);
            
            // Strategy 1: Coordinate calculation
            try {
                const buttonCoords = await page.evaluate(() => {
                    const passwordInput = document.querySelector('input[placeholder="Password"]');
                    if (passwordInput) {
                        const rect = passwordInput.getBoundingClientRect();
                        return { 
                            x: rect.left + (rect.width / 2), 
                            y: rect.bottom + 95 
                        };
                    }
                    return null;
                });

                if (buttonCoords) {
                    await page.mouse.click(buttonCoords.x, buttonCoords.y);
                    await delay(4000);
                    
                    const url = page.url();
                    if (url === 'https://chat.deepseek.com/' || url.includes('/chat')) {
                        console.log("✅ Login successful!");
                        loginSuccess = true;
                        break;
                    }
                }
            } catch (e) {
                console.log("Coordinate method failed");
            }

            // Strategy 2: Text search
            if (!loginSuccess) {
                try {
                    const buttonClicked = await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const loginButton = buttons.find(btn => {
                            const text = btn.textContent.toLowerCase().trim();
                            return text === 'log in' || text === 'login';
                        });
                        if (loginButton) {
                            loginButton.click();
                            return true;
                        }
                        return false;
                    });
                    
                    if (buttonClicked) {
                        await delay(4000);
                        const url = page.url();
                        if (url === 'https://chat.deepseek.com/' || url.includes('/chat')) {
                            console.log("✅ Login successful!");
                            loginSuccess = true;
                            break;
                        }
                    }
                } catch (e) {
                    console.log("Text search failed");
                }
            }

            // Strategy 3: Press Enter
            if (!loginSuccess && retryCount === maxRetries) {
                await page.keyboard.press('Enter');
                await delay(4000);
                
                const url = page.url();
                if (url === 'https://chat.deepseek.com/' || url.includes('/chat')) {
                    console.log("✅ Login successful!");
                    loginSuccess = true;
                }
            }

            if (!loginSuccess && retryCount < maxRetries) {
                await delay(2000);
            }
        }

        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        if (!loginSuccess && !currentUrl.includes('chat')) {
            throw new Error("Login failed - could not access chat");
        }

        // ========== STEP 5: SEND MESSAGE ==========
        console.log("\n💬 Step 5: Sending message...");
        await delay(5000);
        
        const chatSelectors = [
            'textarea[placeholder*="Message"]',
            'textarea[placeholder*="Ask"]',
            'textarea',
            'div[contenteditable="true"]'
        ];

        let messageSent = false;
        for (const selector of chatSelectors) {
            try {
                const chatInput = await page.$(selector);
                if (chatInput) {
                    await chatInput.click();
                    await delay(1000);
                    await page.keyboard.down('Control');
                    await page.keyboard.press('A');
                    await page.keyboard.up('Control');
                    await page.keyboard.press('Backspace');
                    await chatInput.type(userMessage, { delay: 50 });
                    await delay(1000);
                    await page.keyboard.press("Enter");
                    console.log("✅ Message sent!");
                    messageSent = true;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!messageSent) {
            throw new Error("Could not send message");
        }

        // ========== STEP 6: GET RESPONSE ==========
        console.log("\n⏳ Step 6: Waiting for response...");
        await delay(25000); // Wait 25 seconds
        
        const responseSelectors = [
            '.markdown-body',
            '[class*="message"]',
            '[class*="response"]',
            '[class*="ai"]',
            '[class*="assistant"]',
            '.prose'
        ];

        let aiResponse = null;
        for (const selector of responseSelectors) {
            try {
                const responses = await page.$$(selector);
                if (responses.length > 0) {
                    const lastResponse = responses[responses.length - 1];
                    const responseText = await lastResponse.evaluate(el => el.innerText);
                    
                    if (responseText && responseText.length > 20) {
                        aiResponse = responseText;
                        console.log("✅ Response captured!");
                        break;
                    }
                }
            } catch (e) {
                continue;
            }
        }

        if (!aiResponse) {
            aiResponse = "Response was sent but could not be captured";
        }

        // Take final screenshot
        try {
            await page.screenshot({ path: 'screenshot.png' });
            console.log("📸 Screenshot saved");
        } catch (e) {
            console.log("Could not save screenshot:", e.message);
        }

        await browser.close();

        // SUCCESS!
        result.success = true;
        result.aiResponse = aiResponse;
        
        console.log("\n" + "=".repeat(60));
        console.log("🎉 SUCCESS!");
        console.log("=".repeat(60));
        console.log(`📨 Your Message: ${userMessage}`);
        console.log(`🤖 AI Response: ${aiResponse.substring(0, 200)}...`);
        console.log("=".repeat(60));

    } catch (error) {
        console.error("\n❌ ERROR:", error.message);
        console.error("Stack:", error.stack);
        result.error = error.message;
        
        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    await pages[0].screenshot({ path: 'screenshot-error.png' });
                }
            } catch (e) {
                // Ignore screenshot errors
            }
        }
    } finally {
        // Always close browser
        if (browser) {
            try {
                await browser.close();
            } catch (e) {
                console.log("Browser already closed");
            }
        }
        
        // ALWAYS write result.json
        try {
            const resultPath = path.join(process.cwd(), 'result.json');
            fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
            console.log(`\n💾 Results saved to: ${resultPath}`);
        } catch (e) {
            console.error("Failed to write result.json:", e.message);
        }
        
        // Exit with proper code
        console.log(`\n🏁 Exiting with code: ${result.success ? 0 : 1}`);
        process.exit(result.success ? 0 : 1);
    }
})();
