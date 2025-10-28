/**
 * N8N Chat Widget v1.0.0
 * Embed this script on any website to add a chat widget
 * 
 * Usage: 
 * <script src="https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/n8n-chat-widget.js"></script>
 * <script>
 *   N8nChatWidget.init({
 *     webhookUrl: 'YOUR_N8N_WEBHOOK_URL',
 *     title: 'Chat with us',
 *     welcomeMessage: 'Hello! How can I help you today?'
 *   });
 * </script>
 */

(function(window) {
    'use strict';

    const N8nChatWidget = {
        // Default configuration
        config: {
            webhookUrl: '',
            title: 'N8N Chat UI Bot',
            welcomeMessage: 'Hello! This is the default welcome message',
            primaryColor: '#0055d4',
            secondaryColor: '#0066ff',
            position: 'right',
            brandingText: 'Free customizable chat widget for n8n',
            brandingUrl: 'https://n8nchatui.com',
            autoOpen: false,
            showBranding: true
        },

        messages: [],
        sessionId: null,
        isOpen: false,

        // Initialize the widget
        init: function(userConfig) {
            this.config = { ...this.config, ...userConfig };
            this.sessionId = this.generateSessionId();
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.render());
            } else {
                this.render();
            }
        },

        // Generate unique session ID
        generateSessionId: function() {
            return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },

        // Render the widget
        render: function() {
            this.injectStyles();
            this.createWidget();
            this.attachEventListeners();
            
            if (this.config.welcomeMessage) {
                this.addMessage(this.config.welcomeMessage, true);
            }
            
            if (this.config.autoOpen) {
                this.toggleWidget();
            }
        },

        // Inject CSS styles
        injectStyles: function() {
            const styleEl = document.createElement('style');
            styleEl.textContent = `
                #n8n-chat-widget-container * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }

                #n8n-chat-widget-container {
                    position: fixed;
                    bottom: 24px;
                    ${this.config.position}: 24px;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                }

                .n8n-chat-widget {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                    overflow: hidden;
                    width: 380px;
                    max-width: calc(100vw - 48px);
                    height: 600px;
                    max-height: calc(100vh - 100px);
                    display: none;
                    flex-direction: column;
                    animation: n8nSlideUp 0.3s ease-out;
                }

                @keyframes n8nSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .n8n-chat-widget.open { display: flex; }

                .n8n-chat-header {
                    background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
                    color: white;
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 2px 8px rgba(0, 85, 212, 0.2);
                }

                .n8n-chat-header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .n8n-chat-icon {
                    width: 36px;
                    height: 36px;
                    background: white;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                }

                .n8n-chat-title {
                    font-size: 16px;
                    font-weight: 600;
                }

                .n8n-chat-actions {
                    display: flex;
                    gap: 8px;
                }

                .n8n-icon-btn {
                    background: rgba(255, 255, 255, 0.15);
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

                .n8n-icon-btn:hover {
                    background: rgba(255, 255, 255, 0.25);
                }

                .n8n-chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    background: #f9f9f9;
                }

                .n8n-chat-messages::-webkit-scrollbar {
                    width: 6px;
                }

                .n8n-chat-messages::-webkit-scrollbar-track {
                    background: transparent;
                }

                .n8n-chat-messages::-webkit-scrollbar-thumb {
                    background: #ddd;
                    border-radius: 3px;
                }

                .n8n-message {
                    margin-bottom: 16px;
                    display: flex;
                    gap: 12px;
                    animation: n8nMessageSlide 0.3s ease-out;
                }

                @keyframes n8nMessageSlide {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .n8n-bot-avatar {
                    width: 32px;
                    height: 32px;
                    background: ${this.config.primaryColor};
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    color: white;
                    font-size: 18px;
                }

                .n8n-user-avatar {
                    width: 32px;
                    height: 32px;
                    background: #e0e0e0;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .n8n-message-content {
                    flex: 1;
                    min-width: 0;
                }

                .n8n-message.bot .n8n-message-bubble {
                    background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border-top-left-radius: 4px;
                    max-width: 85%;
                    line-height: 1.5;
                    box-shadow: 0 2px 8px rgba(0, 85, 212, 0.2);
                    word-wrap: break-word;
                }

                .n8n-message.user {
                    flex-direction: row-reverse;
                }

                .n8n-message.user .n8n-message-content {
                    display: flex;
                    justify-content: flex-end;
                }

                .n8n-message.user .n8n-message-bubble {
                    background: white;
                    color: #333;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border-top-right-radius: 4px;
                    max-width: 85%;
                    line-height: 1.5;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                    word-wrap: break-word;
                }

                .n8n-message-link {
                    color: white;
                    text-decoration: underline;
                }

                .n8n-typing-indicator {
                    display: inline-flex;
                    gap: 4px;
                }

                .n8n-typing-dot {
                    width: 8px;
                    height: 8px;
                    background: rgba(255, 255, 255, 0.6);
                    border-radius: 50%;
                    animation: n8nTyping 1.4s infinite;
                }

                .n8n-typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .n8n-typing-dot:nth-child(3) { animation-delay: 0.4s; }

                @keyframes n8nTyping {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-6px); }
                }

                .n8n-chat-input-container {
                    padding: 16px 20px;
                    background: white;
                    border-top: 1px solid #e0e0e0;
                }

                .n8n-chat-input-wrapper {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    background: #f5f5f5;
                    border-radius: 24px;
                    padding: 8px 12px;
                    transition: all 0.2s;
                }

                .n8n-chat-input-wrapper:focus-within {
                    background: #ebebeb;
                    box-shadow: 0 0 0 2px rgba(0, 85, 212, 0.2);
                }

                .n8n-chat-input {
                    flex: 1;
                    border: none;
                    background: transparent;
                    padding: 6px 8px;
                    font-size: 14px;
                    outline: none;
                    font-family: inherit;
                }

                .n8n-send-btn {
                    background: ${this.config.primaryColor};
                    border: none;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .n8n-send-btn:hover {
                    background: ${this.config.secondaryColor};
                    transform: scale(1.05);
                }

                .n8n-send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .n8n-chat-toggle-btn {
                    width: 60px;
                    height: 60px;
                    background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.secondaryColor} 100%);
                    border: none;
                    border-radius: 50%;
                    color: white;
                    font-size: 28px;
                    cursor: pointer;
                    box-shadow: 0 4px 16px rgba(0, 85, 212, 0.4);
                    display: flex
