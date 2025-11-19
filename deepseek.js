// ============================================
// FILE 1: deepseek-automation.js
// ============================================

const puppeteer = require("puppeteer");

/**
 * Main function to automate DeepSeek login and message sending
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {string} message - Message to send to DeepSeek
 * @returns {Object} - Response object with status and AI response
 */
async function automateDeepSeek(email, password, message) {
    const delay = ms => new Promise(res => setTimeout(res, ms));
    let browser;
    
    try {
        console.log("🚀 Starting DeepSeek automation...");
        
        browser = await puppeteer.launch({
            headless: true, // Set to false for debugging
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

        const page = await browser.newPage();
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // ========== STEP 1: NAVIGATE TO LOGIN PAGE ==========
        console.log("📄 Opening DeepSeek login page...");
        await page.goto("https://chat.deepseek.com/sign_in", {
            waitUntil: "networkidle2",
            timeout: 60000
        });

        await delay(3000);

        // ========== STEP 2: FILL EMAIL ==========
        console.log("✉️ Filling email...");
        try {
            await page.waitForSelector('input[placeholder="Phone number / email address"]', { timeout: 10000 });
            await page.click('input[placeholder="Phone number / email address"]');
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await page.type('input[placeholder="Phone number / email address"]', email, { delay: 100 });
            console.log("✅ Email filled successfully");
        } catch (error) {
            throw new Error(`Email field error: ${error.message}`);
        }

        // ========== STEP 3: FILL PASSWORD ==========
        console.log("🔐 Filling password...");
        try {
            await page.waitForSelector('input[placeholder="Password"]', { timeout: 5000 });
            await page.click('input[placeholder="Password"]');
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            await page.type('input[placeholder="Password"]', password, { delay: 100 });
            console.log("✅ Password filled successfully");
        } catch (error) {
            throw new Error(`Password field error: ${error.message}`);
        }

        // ========== STEP 4: CLICK LOGIN BUTTON ==========
        console.log("🔘 Attempting to click login button...");
        
        let loginSuccess = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!loginSuccess && retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 Login attempt ${retryCount}/${maxRetries}...`);
            
            // Strategy 1: Coordinate calculation
            try {
                const buttonCoords = await page.evaluate(() => {
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
                    await page.mouse.click(buttonCoords.x, buttonCoords.y);
                    await delay(3000);
                    
                    const url = page.url();
                    if (url === 'https://chat.deepseek.com/' || url.includes('/chat')) {
                        console.log("✅ Login successful!");
                        loginSuccess = true;
                        break;
                    }
                }
            } catch (e) {
                console.log("Coordinate method failed:", e.message);
            }

            // Strategy 2: Text-based button search
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
                        await delay(3000);
                        const url = page.url();
                        if (url === 'https://chat.deepseek.com/' || url.includes('/chat')) {
                            console.log("✅ Login successful!");
                            loginSuccess = true;
                            break;
                        }
                    }
                } catch (e) {
                    console.log("Text search failed:", e.message);
                }
            }

            // Strategy 3: Enter key
            if (!loginSuccess && retryCount === maxRetries) {
                await page.keyboard.press('Enter');
                await delay(3000);
                
                const url = page.url();
                if (url === 'https://chat.deepseek.com/' || url.includes('/chat')) {
                    console.log("✅ Login successful!");
                    loginSuccess = true;
                }
            }

            if (!loginSuccess && retryCount < maxRetries) {
                console.log(`⚠️ Attempt ${retryCount} failed, retrying...`);
                await delay(2000);
            }
        }

        await delay(3000);
        const currentUrl = page.url();
        
        if (!loginSuccess && !currentUrl.includes('chat')) {
            throw new Error("Login failed after all attempts");
        }

        // ========== STEP 5: SEND MESSAGE ==========
        console.log("💬 Sending message to DeepSeek...");
        await delay(5000);
        
        const chatSelectors = [
            'textarea[placeholder*="Message"]',
            'textarea[placeholder*="Ask"]',
            'textarea[placeholder*="message"]',
            'textarea',
            'div[contenteditable="true"]',
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
                    
                    await chatInput.type(message, { delay: 50 });
                    await delay(1000);
                    await page.keyboard.press("Enter");
                    
                    console.log(`✅ Message sent successfully!`);
                    messageSent = true;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!messageSent) {
            throw new Error("Could not find chat input field");
        }

        // ========== STEP 6: CAPTURE RESPONSE ==========
        console.log("⏳ Waiting for AI response...");
        await delay(20000); // Wait longer for response
        
        const responseSelectors = [
            '.markdown-body',
            '[class*="message"]',
            '[class*="response"]',
            '[class*="ai"]',
            '[class*="assistant"]',
            '.prose',
            '[role="article"]'
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
                        console.log("✅ Response captured successfully!");
                        break;
                    }
                }
            } catch (e) {
                continue;
            }
        }

        if (!aiResponse) {
            // Try to get any text from the page as fallback
            aiResponse = await page.evaluate(() => {
                const allText = document.body.innerText;
                return allText;
            });
        }

        await browser.close();
        
        return {
            success: true,
            message: "DeepSeek automation completed successfully",
            userMessage: message,
            aiResponse: aiResponse || "Response received but could not be captured",
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        if (browser) {
            await browser.close();
        }
        
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// ========== N8N INTEGRATION ==========
// For N8N, export the main function
module.exports = { automateDeepSeek };

// ========== STANDALONE EXECUTION ==========
// Uncomment below for standalone testing
/*
const prompt = require("prompt-sync")();

(async () => {
    const email = prompt("Enter email: ");
    const password = prompt("Enter password: ");
    const message = prompt("Enter message: ");
    
    const result = await automateDeepSeek(email, password, message);
    console.log("\n" + "=".repeat(60));
    console.log("RESULT:");
    console.log("=".repeat(60));
    console.log(JSON.stringify(result, null, 2));
    console.log("=".repeat(60));
})();
*/


// ============================================
// FILE 2: n8n-workflow.json (web.yml alternative)
// ============================================

/*
{
  "name": "DeepSeek Automation Workflow",
  "nodes": [
    {
      "parameters": {},
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "const puppeteer = require('puppeteer');\n\n// Get input data from previous node\nconst email = $input.item.json.email || 'hasnainnisar73@gmail.com';\nconst password = $input.item.json.password || 'Junaid@24290';\nconst userMessage = $input.item.json.message || 'Hello, how are you?';\n\nconst delay = ms => new Promise(res => setTimeout(res, ms));\n\nconst browser = await puppeteer.launch({\n    headless: true,\n    args: [\n        '--no-sandbox',\n        '--disable-setuid-sandbox',\n        '--disable-dev-shm-usage',\n        '--disable-blink-features=AutomationControlled'\n    ]\n});\n\nconst page = await browser.newPage();\n\ntry {\n    // Navigate to login\n    await page.goto('https://chat.deepseek.com/sign_in', {\n        waitUntil: 'networkidle2',\n        timeout: 60000\n    });\n    \n    await delay(3000);\n    \n    // Fill email\n    await page.waitForSelector('input[placeholder=\"Phone number / email address\"]', { timeout: 10000 });\n    await page.type('input[placeholder=\"Phone number / email address\"]', email, { delay: 100 });\n    \n    // Fill password\n    await page.waitForSelector('input[placeholder=\"Password\"]', { timeout: 5000 });\n    await page.type('input[placeholder=\"Password\"]', password, { delay: 100 });\n    \n    // Click login button\n    const buttonCoords = await page.evaluate(() => {\n        const passwordInput = document.querySelector('input[placeholder=\"Password\"]');\n        if (passwordInput) {\n            const rect = passwordInput.getBoundingClientRect();\n            return { x: rect.left + rect.width / 2, y: rect.bottom + 95 };\n        }\n        return null;\n    });\n    \n    if (buttonCoords) {\n        await page.mouse.click(buttonCoords.x, buttonCoords.y);\n    } else {\n        await page.keyboard.press('Enter');\n    }\n    \n    await delay(8000);\n    \n    // Send message\n    const chatInput = await page.$('textarea');\n    if (chatInput) {\n        await chatInput.type(userMessage, { delay: 50 });\n        await page.keyboard.press('Enter');\n    }\n    \n    await delay(20000);\n    \n    // Get response\n    const responses = await page.$$('.markdown-body');\n    let aiResponse = 'No response captured';\n    \n    if (responses.length > 0) {\n        const lastResponse = responses[responses.length - 1];\n        aiResponse = await lastResponse.evaluate(el => el.innerText);\n    }\n    \n    await browser.close();\n    \n    return [{\n        json: {\n            success: true,\n            userMessage: userMessage,\n            aiResponse: aiResponse,\n            timestamp: new Date().toISOString()\n        }\n    }];\n    \n} catch (error) {\n    await browser.close();\n    return [{\n        json: {\n            success: false,\n            error: error.message,\n            timestamp: new Date().toISOString()\n        }\n    }];\n}"
      },
      "name": "DeepSeek Automation",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "options": {}
      },
      "name": "Return Result",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Start": {
      "main": [
        [
          {
            "node": "DeepSeek Automation",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "DeepSeek Automation": {
      "main": [
        [
          {
            "node": "Return Result",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
*/


// ============================================
// FILE 3: package.json
// ============================================

/*
{
  "name": "deepseek-n8n-automation",
  "version": "1.0.0",
  "description": "DeepSeek automation for N8N",
  "main": "deepseek-automation.js",
  "scripts": {
    "test": "node deepseek-automation.js"
  },
  "dependencies": {
    "puppeteer": "^21.6.1",
    "prompt-sync": "^4.2.0"
  },
  "keywords": ["n8n", "automation", "deepseek", "puppeteer"],
  "author": "Your Name",
  "license": "MIT"
}
*/


// ============================================
// FILE 4: docker-compose.yml (For N8N Setup)
// ============================================

/*
version: '3.8'

services:
  n8n:
    image: n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin123
      - NODE_FUNCTION_ALLOW_EXTERNAL=puppeteer
    volumes:
      - n8n_data:/home/node/.n8n
      - ./deepseek-automation.js:/usr/local/lib/node_modules/n8n/dist/custom-modules/deepseek-automation.js

volumes:
  n8n_data:
*/


// ============================================
// USAGE INSTRUCTIONS
// ============================================

/*

## SETUP FOR N8N:

1. Install N8N:
   npm install n8n -g

2. Install dependencies in N8N directory:
   npm install puppeteer

3. Start N8N:
   n8n start

4. Access N8N at: http://localhost:5678

5. Create a new workflow and import the n8n-workflow.json

6. Configure the workflow with your credentials:
   - email: Your DeepSeek email
   - password: Your DeepSeek password
   - message: The message you want to send

7. Execute the workflow!


## SETUP FOR STANDALONE:

1. Install dependencies:
   npm install puppeteer prompt-sync

2. Run the script:
   node deepseek-automation.js


## N8N WEBHOOK SETUP:

1. Add a Webhook node at the start
2. Set the webhook to accept POST requests
3. Expected JSON body:
   {
     "email": "your-email@example.com",
     "password": "your-password",
     "message": "Your message here"
   }

4. Connect Webhook → Function → Respond to Webhook


## TESTING WITH CURL:

curl -X POST http://localhost:5678/webhook/deepseek \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hasnainnisar73@gmail.com",
    "password": "Junaid@24290",
    "message": "What is artificial intelligence?"
  }'

*/
