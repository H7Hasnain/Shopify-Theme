/**
 * N8N Custom Chat Widget
 * Version: 1.0.0
 * Author: Your Name
 * 
 * Usage:
 * <script type="module" defer>
 *   import Chatbot from "https://raw.githubusercontent.com/H7Hasnain/Shopify-Theme/main/N8n.js";
 *   Chatbot.init({
 *     n8nChatUrl: "YOUR_N8N_WEBHOOK_URL",
 *     theme: { ... }
 *   });
 * </script>
 */

const N8nChatWidget = {
  // Default configuration
  defaultConfig: {
    n8nChatUrl: '',
    metadata: {},
    theme: {
      button: {
        backgroundColor: '#0055d4',
        right: 20,
        bottom: 20,
        size: 60,
        iconColor: '#ffffff',
        customIconSrc: '',
        customIconSize: 28,
        customIconBorderRadius: 50,
        autoWindowOpen: {
          autoOpen: false,
          openDelay: 2
        },
        borderRadius: 'rounded'
      },
      tooltip: {
        showTooltip: true,
        tooltipMessage: 'Hi! How can I help you?',
        tooltipBackgroundColor: '#ffffff',
        tooltipTextColor: '#1c1c1c',
        tooltipFontSize: 14
      },
      chatWindow: {
        borderRadiusStyle: 'rounded',
        avatarBorderRadius: 8,
        messageBorderRadius: 12,
        showTitle: true,
        title: 'N8N Chat UI Bot',
        titleAvatarSrc: '',
        avatarSize: 32,
        welcomeMessage: 'Hello! This is the default welcome message',
        errorMessage: 'Connection error. Please try again.',
        backgroundColor: '#ffffff',
        height: 600,
        width: 400,
        fontSize: 14,
        starterPrompts: [],
        starterPromptFontSize: 14,
        renderHTML: false,
        clearChatOnReload: false,
        showScrollbar: true,
        botMessage: {
          backgroundColor: '#0055d4',
          textColor: '#ffffff',
          showAvatar: true,
          avatarSrc: '',
          showCopyToClipboardIcon: false
        },
        userMessage: {
          backgroundColor: '#f5f5f5',
          textColor: '#333333',
          showAvatar: true,
          avatarSrc: ''
        },
        textInput: {
          placeholder: 'Type your query',
          backgroundColor: '#f5f5f5',
          textColor: '#333333',
          sendButtonColor: '#0055d4',
          maxChars: 1000,
          maxCharsWarningMessage: 'Character limit exceeded',
          autoFocus: false,
          borderRadius: 24,
          sendButtonBorderRadius: 50
        },
        uploadsConfig: {
          enabled: false,
          acceptFileTypes: ['jpeg', 'jpg', 'png', 'pdf'],
          maxFiles: 5,
          maxSizeInMB: 10
        },
        voiceInputConfig: {
          enabled: false,
          maxRecordingTime: 15,
          recordingNotSupportedMessage: 'Audio recording not supported'
        }
      }
    }
  },

  config: null,
  isOpen: false,
  sessionId: null,
  messages: [],

  // Initialize the chatbot
  init(userConfig) {
    this.config = this.mergeDeep(this.defaultConfig, userConfig);
    this.sessionId = this.generateSessionId();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.render());
    } else {
      this.render();
    }
  },

  // Deep merge objects
  mergeDeep(target, source) {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  },

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  },

  // Generate session ID
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  // Render the widget
  render() {
    this.injectStyles();
    this.createWidget();
    this.attachEventListeners();
    
    if (this.config.theme.chatWindow.welcomeMessage) {
      this.addMessage(this.config.theme.chatWindow.welcomeMessage, true);
    }

    if (this.config.theme.button.autoWindowOpen.autoOpen) {
      setTimeout(() => {
        this.toggleChat();
      }, this.config.theme.button.autoWindowOpen.openDelay * 1000);
    }
  },

  // Inject CSS
  injectStyles() {
    const theme = this.config.theme;
    const btn = theme.button;
    const chat = theme.chatWindow;
    
    const borderRadius = btn.borderRadius === 'rounded' ? '50%' : btn.customIconBorderRadius + 'px';
    const chatBorderRadius = chat.borderRadiusStyle === 'rounded' ? '16px' : '0px';

    const styles = `
      #n8n-chat-container * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      #n8n-chat-container {
        position: fixed;
        bottom: ${btn.bottom}px;
        right: ${btn.right}px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }

      .n8n-toggle-btn {
        width: ${btn.size}px;
        height: ${btn.size}px;
        background: ${btn.backgroundColor};
        border: none;
        border-radius: ${borderRadius};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s, box-shadow 0.2s;
        color: ${btn.iconColor};
        font-size: ${btn.customIconSize}px;
      }

      .n8n-toggle-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
      }

      .n8n-toggle-btn img {
        width: ${btn.customIconSize}px;
        height: ${btn.customIconSize}px;
        object-fit: contain;
      }

      .n8n-tooltip {
        position: absolute;
        bottom: ${btn.size + 10}px;
        right: 0;
        background: ${theme.tooltip.tooltipBackgroundColor};
        color: ${theme.tooltip.tooltipTextColor};
        padding: 10px 16px;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        font-size: ${theme.tooltip.tooltipFontSize}px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
      }

      .n8n-tooltip.show {
        opacity: 1;
      }

      .n8n-chat-window {
        position: fixed;
        bottom: ${btn.bottom + btn.size + 10}px;
        right: ${btn.right}px;
        width: ${chat.width}px;
        max-width: calc(100vw - 40px);
        height: ${chat.height}px;
        max-height: calc(100vh - ${btn.bottom + btn.size + 20}px);
        background: ${chat.backgroundColor};
        border-radius: ${chatBorderRadius};
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: slideUp 0.3s ease-out;
      }

      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .n8n-chat-window.open {
        display: flex;
      }

      .n8n-chat-header {
        background: linear-gradient(135deg, ${chat.botMessage.backgroundColor} 0%, ${chat.botMessage.backgroundColor}dd 100%);
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .n8n-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .n8n-header-avatar {
        width: ${chat.avatarSize}px;
        height: ${chat.avatarSize}px;
        border-radius: ${chat.avatarBorderRadius}px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        font-size: 20px;
      }

      .n8n-header-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: ${chat.avatarBorderRadius}px;
      }

      .n8n-header-title {
        font-size: 16px;
        font-weight: 600;
      }

      .n8n-close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .n8n-close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .n8n-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #f9f9f9;
      }

      ${!chat.showScrollbar ? `
      .n8n-messages::-webkit-scrollbar {
        display: none;
      }
      .n8n-messages {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      ` : ''}

      .n8n-message {
        margin-bottom: 16px;
        display: flex;
        gap: 12px;
        animation: messageSlide 0.3s ease-out;
      }

      @keyframes messageSlide {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .n8n-message.bot {
        flex-direction: row;
      }

      .n8n-message.user {
        flex-direction: row-reverse;
      }

      .n8n-avatar {
        width: ${chat.avatarSize}px;
        height: ${chat.avatarSize}px;
        border-radius: ${chat.avatarBorderRadius}px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }

      .n8n-message.bot .n8n-avatar {
        background: ${chat.botMessage.backgroundColor};
        color: white;
      }

      .n8n-message.user .n8n-avatar {
        background: ${chat.userMessage.backgroundColor};
        color: ${chat.userMessage.textColor};
      }

      .n8n-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: ${chat.avatarBorderRadius}px;
      }

      .n8n-message-bubble {
        padding: 12px 16px;
        border-radius: ${chat.messageBorderRadius}px;
        max-width: 75%;
        word-wrap: break-word;
        font-size: ${chat.fontSize}px;
        line-height: 1.5;
      }

      .n8n-message.bot .n8n-message-bubble {
        background: ${chat.botMessage.backgroundColor};
        color: ${chat.botMessage.textColor};
        border-top-left-radius: 4px;
      }

      .n8n-message.user .n8n-message-bubble {
        background: ${chat.userMessage.backgroundColor};
        color: ${chat.userMessage.textColor};
        border-top-right-radius: 4px;
      }

      .n8n-starter-prompts {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 0 20px 16px;
      }

      .n8n-prompt-btn {
        background: white;
        border: 1px solid #e0e0e0;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-size: ${chat.starterPromptFontSize}px;
        transition: all 0.2s;
        color: #333;
      }

      .n8n-prompt-btn:hover {
        background: #f5f5f5;
        border-color: ${chat.botMessage.backgroundColor};
      }

      .n8n-input-container {
        padding: 16px 20px;
        background: white;
        border-top: 1px solid #e0e0e0;
      }

      .n8n-input-wrapper {
        display: flex;
        gap: 8px;
        align-items: center;
        background: ${chat.textInput.backgroundColor};
        border-radius: ${chat.textInput.borderRadius}px;
        padding: 8px 12px;
      }

      .n8n-input {
        flex: 1;
        border: none;
        background: transparent;
        padding: 6px 8px;
        font-size: ${chat.fontSize}px;
        outline: none;
        color: ${chat.textInput.textColor};
      }

      .n8n-input::placeholder {
        color: #999;
      }

      .n8n-send-btn {
        background: ${chat.textInput.sendButtonColor};
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: ${chat.textInput.sendButtonBorderRadius}%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
      }

      .n8n-send-btn:hover:not(:disabled) {
        transform: scale(1.05);
      }

      .n8n-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .n8n-typing {
        display: inline-flex;
        gap: 4px;
      }

      .n8n-typing-dot {
        width: 8px;
        height: 8px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        animation: typing 1.4s infinite;
      }

      .n8n-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .n8n-typing-dot:nth-child(3) { animation-delay: 0.4s; }

      @keyframes typing {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-6px); }
      }

      @media (max-width: 768px) {
        .n8n-chat-window {
          width: calc(100vw - 40px);
          height: calc(100vh - ${btn.bottom + btn.size + 40}px);
        }
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  },

  // Create widget HTML
  createWidget() {
    const theme = this.config.theme;
    const btn = theme.button;
    const chat = theme.chatWindow;

    const container = document.createElement('div');
    container.id = 'n8n-chat-container';

    const buttonIcon = btn.customIconSrc 
      ? `<img src="${btn.customIconSrc}" alt="Chat" />`
      : '💬';

    const headerAvatar = chat.titleAvatarSrc
      ? `<img src="${chat.titleAvatarSrc}" alt="Bot" />`
      : '🤖';

    container.innerHTML = `
      ${theme.tooltip.showTooltip ? `
        <div class="n8n-tooltip" id="n8nTooltip">
          ${theme.tooltip.tooltipMessage}
        </div>
      ` : ''}
      
      <button class="n8n-toggle-btn" id="n8nToggleBtn" aria-label="Toggle chat">
        ${buttonIcon}
      </button>

      <div class="n8n-chat-window" id="n8nChatWindow">
        ${chat.showTitle ? `
          <div class="n8n-chat-header">
            <div class="n8n-header-left">
              <div class="n8n-header-avatar">${headerAvatar}</div>
              <div class="n8n-header-title">${chat.title}</div>
            </div>
            <button class="n8n-close-btn" id="n8nCloseBtn" aria-label="Close chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ` : ''}

        <div class="n8n-messages" id="n8nMessages"></div>

        ${chat.starterPrompts && chat.starterPrompts.length > 0 ? `
          <div class="n8n-starter-prompts" id="n8nStarterPrompts">
            ${chat.starterPrompts.map((prompt, i) => `
              <button class="n8n-prompt-btn" data-prompt="${prompt}">${prompt}</button>
            `).join('')}
          </div>
        ` : ''}

        <div class="n8n-input-container">
          <div class="n8n-input-wrapper">
            <input 
              type="text" 
              class="n8n-input" 
              id="n8nInput" 
              placeholder="${chat.textInput.placeholder}"
              maxlength="${chat.textInput.maxChars}"
              ${chat.textInput.autoFocus ? 'autofocus' : ''}
            />
            <button class="n8n-send-btn" id="n8nSendBtn" aria-label="Send message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Show tooltip after delay
    if (theme.tooltip.showTooltip) {
      setTimeout(() => {
        const tooltip = document.getElementById('n8nTooltip');
        if (tooltip) tooltip.classList.add('show');
      }, 1000);
    }
  },

  // Attach event listeners
  attachEventListeners() {
    const toggleBtn = document.getElementById('n8nToggleBtn');
    const closeBtn = document.getElementById('n8nCloseBtn');
    const sendBtn = document.getElementById('n8nSendBtn');
    const input = document.getElementById('n8nInput');
    const starterPrompts = document.querySelectorAll('.n8n-prompt-btn');

    if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleChat());
    if (closeBtn) closeBtn.addEventListener('click', () => this.toggleChat());
    if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    starterPrompts.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prompt = e.target.getAttribute('data-prompt');
        this.sendMessage(prompt);
        document.getElementById('n8nStarterPrompts').style.display = 'none';
      });
    });
  },

  // Toggle chat window
  toggleChat() {
    const chatWindow = document.getElementById('n8nChatWindow');
    const tooltip = document.getElementById('n8nTooltip');
    
    this.isOpen = !this.isOpen;
    chatWindow.classList.toggle('open', this.isOpen);
    
    if (tooltip) {
      tooltip.classList.remove('show');
    }

    if (this.isOpen && this.config.theme.chatWindow.textInput.autoFocus) {
      setTimeout(() => {
        document.getElementById('n8nInput').focus();
      }, 100);
    }
  },

  // Send message
  async sendMessage(text) {
    const input = document.getElementById('n8nInput');
    const message = text || input.value.trim();
    
    if (!message) return;

    // Add user message
    this.addMessage(message, false);
    input.value = '';

    // Show typing indicator
    this.showTyping();

    try {
      // Send to N8N webhook
      const response = await fetch(this.config.n8nChatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          message: message,
          metadata: this.config.metadata,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      
      // Remove typing indicator
      this.hideTyping();

      // Add bot response
      const botMessage = data.output || data.message || data.response || 'Thank you for your message!';
      this.addMessage(botMessage, true);

    } catch (error) {
      console.error('N8N Chat Error:', error);
      this.hideTyping();
      this.addMessage(this.config.theme.chatWindow.errorMessage, true);
    }
  },

  // Add message to chat
  addMessage(text, isBot) {
    const messagesContainer = document.getElementById('n8nMessages');
    const chat = this.config.theme.chatWindow;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `n8n-message ${isBot ? 'bot' : 'user'}`;

    const showAvatar = isBot ? chat.botMessage.showAvatar : chat.userMessage.showAvatar;
    const avatarSrc = isBot ? chat.botMessage.avatarSrc : chat.userMessage.avatarSrc;
    const avatarContent = avatarSrc ? `<img src="${avatarSrc}" alt="Avatar" />` : (isBot ? '🤖' : '👤');

    const content = chat.renderHTML ? text : this.escapeHtml(text);

    messageDiv.innerHTML = `
      ${showAvatar ? `<div class="n8n-avatar">${avatarContent}</div>` : ''}
      <div class="n8n-message-bubble">${content}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    this.messages.push({ text, isBot, timestamp: new Date() });
  },

  // Show typing indicator
  showTyping() {
    const messagesContainer = document.getElementById('n8nMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'n8n-message bot';
    typingDiv.id = 'n8nTyping';
    typingDiv.innerHTML = `
      <div class="n8n-avatar">🤖</div>
      <div class="n8n-message-bubble">
        <div class="n8n-typing">
          <div class="n8n-typing-dot"></div>
          <div class="n8n-typing-dot"></div>
          <div class="n8n-typing-dot"></div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  // Hide typing indicator
  hideTyping() {
    const typing = document.getElementById('n8nTyping');
    if (typing) typing.remove();
  },

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export for module usage
export default N8nChatWidget;
