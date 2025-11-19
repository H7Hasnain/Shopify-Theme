const puppeteer = require("puppeteer");
const fs = require("fs");

const delay = ms => new Promise(res => setTimeout(res, ms));

// Get credentials from environment variables
const email = process.env.DEEPSEEK_EMAIL || "hasnainnisar73@gmail.com";
const password = process.env.DEEPSEEK_PASSWORD || "Junaid@24290";
const userMessage = process.env.USER_MESSAGE || "Hello, how are you?";

console.log("🚀 Starting DeepSeek Automation...");

(async () => {
    let browser;
    const result = {
        success: false,
        error: null,
        userMessage: userMessage,
        aiResponse: null,
        timestamp: new Date().toISOString()
    };

    try {
        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Navigate to login
        console.log("📄 Opening login page...");
        await page.goto("https://chat.deepseek.com/sign_in", {
            waitUntil: "networkidle2",
            timeout: 60000
        });
        await delay(3000);

        // Fill email
        console.log("✉️ Filling email...");
        await page.waitForSelector('input[placeholder="Phone number / email address"]', { timeout: 10000 });
        await page.type('input[placeholder="Phone number / email address"]', email, { delay: 100 });

        // Fill password
        console.log("🔐 Filling password...");
        await page.waitForSelector('input[placeholder="Password"]', { timeout: 5000 });
        await page.type('input[placeholder="Password"]', password, { delay: 100 });

        // Click login
        console.log("🔘 Clicking login...");
        let loginSuccess = false;

        // Strategy 1: Coordinate calculation
        try {
            const buttonCoords = await page.evaluate(() => {
                const passwordInput = document.querySelector('input[placeholder="Password"]');
                if (passwordInput) {
                    const rect = passwordInput.getBoundingClientRect();
                    return { x: rect.left + rect.width / 2, y: rect.bottom + 95 };
                }
                return null;
            });

            if (buttonCoords) {
                await page.mouse.click(buttonCoords.x, buttonCoords.y);
                await delay(4000);
                if (page.url().includes('chat')) {
                    loginSuccess = true;
                }
            }
        } catch (e) {
            console.log("Coordinate method failed");
        }

        // Strategy 2: Find button by text
        if (!loginSuccess) {
            try {
                await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const loginButton = buttons.find(btn => 
                        btn.textContent.toLowerCase().includes('log in')
                    );
                    if (loginButton) loginButton.click();
                });
                await delay(4000);
                if (page.url().includes('chat')) {
                    loginSuccess = true;
                }
            } catch (e) {
                console.log("Text search failed");
            }
        }

        // Strategy 3: Press Enter
        if (!loginSuccess) {
            await page.keyboard.press('Enter');
            await delay(4000);
            if (page.url().includes('chat')) {
                loginSuccess = true;
            }
        }

        if (!loginSuccess) {
            throw new Error("Login failed");
        }

        console.log("✅ Login successful!");

        // Send message
        console.log("💬 Sending message...");
        await delay(5000);

        const chatInput = await page.$('textarea');
        if (!chatInput) {
            throw new Error("Chat input not found");
        }

        await chatInput.type(userMessage, { delay: 50 });
        await page.keyboard.press('Enter');
        console.log("✅ Message sent!");

        // Wait for response
        console.log("⏳ Waiting for response...");
        await delay(25000);

        // Capture response
        const responses = await page.$$('.markdown-body, [class*="message"], [class*="response"]');
        if (responses.length > 0) {
            const lastResponse = responses[responses.length - 1];
            result.aiResponse = await lastResponse.evaluate(el => el.innerText);
        } else {
            result.aiResponse = "Response received but not captured";
        }

        result.success = true;
        console.log("🎉 SUCCESS!");

    } catch (error) {
        console.error("❌ Error:", error.message);
        result.error = error.message;
    } finally {
        if (browser) {
            await browser.close();
        }

        // Write result.json
        fs.writeFileSync('result.json', JSON.stringify(result, null, 2));
        console.log("💾 Results saved to result.json");

        // Exit with proper code
        process.exit(result.success ? 0 : 1);
    }
})();
