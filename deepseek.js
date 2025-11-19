const puppeteer = require("puppeteer");
const fs = require('fs');
const path = require('path');

// Get message from environment variable or use default
const userMessage = process.env.USER_MESSAGE || "Hello, how are you?";
const DEEPSEEK_EMAIL = process.env.DEEPSEEK_EMAIL;
const DEEPSEEK_PASSWORD = process.env.DEEPSEEK_PASSWORD;

// Results file path
const RESULTS_FILE = process.env.GITHUB_WORKSPACE ? 
    path.join(process.env.GITHUB_WORKSPACE, 'deepseek_response.txt') : 
    'deepseek_response.txt';

const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
    // Validate credentials
    if (!DEEPSEEK_EMAIL || !DEEPSEEK_PASSWORD) {
        console.error("❌ Missing DeepSeek credentials");
        process.exit(1);
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: process.env.NODE_ENV !== 'development',
            defaultViewport: null,
            args: [
                "--start-maximized",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--window-size=1920,1080"
            ]
        });

        console.log("🚀 Starting DeepSeek Automation...");
        console.log("📝 Message:", userMessage);

        // ------------------ DEEPSEEK LOGIN ------------------
        console.log("Opening DeepSeek Login...");
        const deepseekPage = await browser.newPage();

        // Set user agent to avoid detection
        await deepseekPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        await deepseekPage.goto("https://chat.deepseek.com/sign_in", {
            waitUntil: "networkidle2",
            timeout: 60000
        });

        // Wait for page to load completely
        await delay(5000);

        // Fill email/phone field
        try {
            await deepseekPage.waitForSelector('input[placeholder="Phone number / email address"]', { timeout: 10000 });
            await deepseekPage.click('input[placeholder="Phone number / email address"]');
            await deepseekPage.keyboard.down('Control');
            await deepseekPage.keyboard.press('A');
            await deepseekPage.keyboard.up('Control');
            await deepseekPage.keyboard.press('Backspace');
            await deepseekPage.type('input[placeholder="Phone number / email address"]', DEEPSEEK_EMAIL, { delay: 100 });
            console.log("✅ Email filled successfully");
        } catch (error) {
            console.log("❌ Email field error:", error.message);
        }

        // Fill password field
        try {
            await deepseekPage.waitForSelector('input[placeholder="Password"]', { timeout: 5000 });
            await deepseekPage.click('input[placeholder="Password"]');
            await deepseekPage.keyboard.down('Control');
            await deepseekPage.keyboard.press('A');
            await deepseekPage.keyboard.up('Control');
            await deepseekPage.keyboard.press('Backspace');
            await deepseekPage.type('input[placeholder="Password"]', DEEPSEEK_PASSWORD, { delay: 100 });
            console.log("✅ Password filled successfully");
        } catch (error) {
            console.log("❌ Password field error:", error.message);
        }

        // IMPROVED LOGIN BUTTON CLICKING
        console.log("Attempting to find and click login button...");
        
        let loginSuccess = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!loginSuccess && retryCount < maxRetries) {
            retryCount++;
            console.log(`\n🔄 Login attempt ${retryCount}/${maxRetries}...`);
            
            // Strategy 1: Calculate coordinates based on password field
            try {
                console.log("Strategy 1: Calculating button position from password field...");
                const buttonCoords = await deepseekPage.evaluate(() => {
                    const passwordInput = document.querySelector('input[placeholder="Password"]');
                    if (passwordInput) {
                        const rect = passwordInput.getBoundingClientRect();
                        const buttonX = rect.left + (rect.width / 2);
                        const buttonY = rect.bottom + 95;
                        return { x: buttonX, y: buttonY };
                    }
                    return null;
                });

                if (buttonCoords) {
                    console.log(`Clicking at coordinates: (${buttonCoords.x}, ${buttonCoords.y})`);
                    await deepseekPage.mouse.click(buttonCoords.x, buttonCoords.y);
                    console.log("✅ Clicked using coordinate calculation!");
                    await delay(3000);
                    
                    // Check if redirected
                    const url = deepseekPage.url();
                    if (url === 'https://chat.deepseek.com/' || url.includes('/chat')) {
                        console.log("✅ Login successful - redirected to chat!");
                        loginSuccess = true;
                        break;
                    }
                }
            } catch (e) {
                console.log("Coordinate calculation failed:", e.message);
            }

            // Strategy 2: Find button by text content
            if (!loginSuccess) {
                try {
                    console.log("Strategy 2: Finding button by text content...");
                    const buttonClicked = await deepseekPage.evaluate(() => {
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
                        console.log("✅ Button clicked by text content!");
                        await delay(3000);
                        
                        const url = deepseekPage.url();
                        if (url === 'https://chat.deepseek.com/' || url.includes('/chat')) {
                            console.log("✅ Login successful - redirected to chat!");
                            loginSuccess = true;
                            break;
                        }
                    }
                } catch (e) {
                    console.log("Text search failed:", e.message);
                }
            }

            // Strategy 3: Press Enter as last resort
            if (!loginSuccess && retryCount === maxRetries) {
                console.log("Strategy 3: Pressing Enter as final attempt...");
                await deepseekPage.keyboard.press('Enter');
                await delay(3000);
                
                const url = deepseekPage.url();
                if (url === 'https://chat.deepseek.com/' || url.includes('/chat')) {
                    console.log("✅ Login successful - redirected to chat!");
                    loginSuccess = true;
                }
            }

            if (!loginSuccess && retryCount < maxRetries) {
                console.log(`⚠️ Attempt ${retryCount} failed, retrying...`);
                await delay(2000);
            }
        }

        // Final login check
        await delay(5000);
        const currentUrl = deepseekPage.url();
        console.log("\n📍 Final URL:", currentUrl);
        
        if (loginSuccess || currentUrl.includes('chat') || currentUrl === 'https://chat.deepseek.com/') {
            console.log("\n✅ LOGIN SUCCESSFUL! Now accessing chat...");
            
            // ------------------ SEND USER MESSAGE ------------------
            try {
                await delay(5000);
                
                console.log("Looking for chat input...");
                
                // Multiple strategies to find chat input
                const chatSelectors = [
                    'textarea[placeholder*="Message"]',
                    'textarea[placeholder*="Ask"]',
                    'textarea[placeholder*="message"]',
                    'textarea',
                    'div[contenteditable="true"]',
                    'input[type="text"]',
                    '[placeholder*="ask"]'
                ];

                let messageSent = false;
                for (const selector of chatSelectors) {
                    try {
                        await deepseekPage.waitForSelector(selector, { timeout: 5000 });
                        const chatInput = await deepseekPage.$(selector);
                        if (chatInput) {
                            await chatInput.click();
                            await delay(1000);
                            
                            // Clear any existing text
                            await deepseekPage.keyboard.down('Control');
                            await deepseekPage.keyboard.press('A');
                            await deepseekPage.keyboard.up('Control');
                            await deepseekPage.keyboard.press('Backspace');
                            
                            await chatInput.type(userMessage, { delay: 50 });
                            await delay(1000);
                            await deepseekPage.keyboard.press("Enter");
                            
                            console.log(`✅ Message sent using selector: ${selector}`);
                            messageSent = true;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }

                if (messageSent) {
                    // Wait for and capture response
                    console.log("⏳ Waiting for AI response...");
                    await delay(15000);
                    
                    // Multiple strategies to get response
                    const responseSelectors = [
                        '.markdown-body',
                        '[class*="message"]',
                        '[class*="response"]',
                        '[class*="ai"]',
                        '[class*="assistant"]',
                        '.prose',
                        '[role="article"]',
                        '.message-content',
                        '[data-testid*="message"]'
                    ];

                    let responseFound = false;
                    for (const selector of responseSelectors) {
                        try {
                            const responses = await deepseekPage.$$(selector);
                            if (responses.length > 0) {
                                // Get the last response (should be the AI's response)
                                const lastResponse = responses[responses.length - 1];
                                const responseText = await lastResponse.evaluate(el => el.innerText || el.textContent);
                                
                                if (responseText && responseText.length > 10) {
                                    console.log("\n" + "=".repeat(60));
                                    console.log("🤖 DEEPSEEK RESPONSE:");
                                    console.log("=".repeat(60));
                                    console.log(responseText);
                                    console.log("=".repeat(60) + "\n");
                                    
                                    // Save response to file
                                    fs.writeFileSync(RESULTS_FILE, responseText, 'utf8');
                                    console.log(`✅ Response saved to: ${RESULTS_FILE}`);
                                    responseFound = true;
                                    break;
                                }
                            }
                        } catch (e) {
                            continue;
                        }
                    }

                    if (!responseFound) {
                        const errorMsg = "Could not capture response, but message was sent.";
                        console.log("❌ " + errorMsg);
                        fs.writeFileSync(RESULTS_FILE, errorMsg, 'utf8');
                    }
                } else {
                    const errorMsg = "❌ Could not find chat input";
                    console.log(errorMsg);
                    fs.writeFileSync(RESULTS_FILE, errorMsg, 'utf8');
                }

            } catch (error) {
                const errorMsg = `Chat error: ${error.message}`;
                console.log("❌ " + errorMsg);
                fs.writeFileSync(RESULTS_FILE, errorMsg, 'utf8');
            }
        } else {
            const errorMsg = `❌ Login failed - still on: ${currentUrl}`;
            console.log(errorMsg);
            fs.writeFileSync(RESULTS_FILE, errorMsg, 'utf8');
        }

    } catch (error) {
        console.error("❌ Critical error:", error);
        if (fs.existsSync(RESULTS_FILE)) {
            fs.writeFileSync(RESULTS_FILE, `Critical error: ${error.message}`, 'utf8');
        }
    } finally {
        if (browser) {
            await browser.close();
            console.log("🔒 Browser closed");
        }
    }

    console.log("🎉 Process completed!");
})();
