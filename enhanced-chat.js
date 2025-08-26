// enhanced-chat.js - Production-ready chat system with real AI integration

class EnhancedChatManager {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        
        // Configuration
        this.config = {
            apiEndpoint: '/.netlify/functions/chat',
            maxMessageLength: 1000,
            maxHistoryLength: 20,
            typingDelay: { min: 1000, max: 3000 },
            retryAttempts: 3,
            retryDelay: 1000,
            providers: ['openai', 'anthropic', 'gemini'],
            currentProvider: 'openai'
        };
        
        // State management
        this.state = {
            isTyping: false,
            chatHistory: [],
            currentFriend: null,
            apiKeySet: false,
            retryCount: 0,
            lastMessageTime: 0,
            connectionStatus: 'connected'
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.initializeConnectionCheck();
        this.displayWelcomeMessage();
        console.log('💬 Enhanced chat system initialized');
    }

    setupEventListeners() {
        // Send button
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Enter key handling
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Input validation and auto-resize
        this.messageInput.addEventListener('input', (e) => {
            this.handleInputChange(e);
        });

        // Focus management
        this.messageInput.addEventListener('focus', () => {
            this.markAsRead();
        });

        // Quick starters
        this.setupQuickStarters();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape to clear input
            if (e.key === 'Escape') {
                this.messageInput.value = '';
                this.messageInput.blur();
            }
            
            // Ctrl/Cmd + K to focus input
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.messageInput.focus();
            }
        });
    }

    setupQuickStarters() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-starter')) {
                const message = e.target.dataset.message;
                this.messageInput.value = message;
                this.sendMessage();
            }
        });
    }

    initializeConnectionCheck() {
        // Check API connectivity on load
        this.checkAPIConnection();
        
        // Periodic connectivity check
        setInterval(() => {
            if (Date.now() - this.state.lastMessageTime > 300000) { // 5 minutes
                this.checkAPIConnection();
            }
        }, 60000); // Check every minute
    }

    async checkAPIConnection() {
        try {
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "ping",
                    friendData: { name: "System", type: "system" }
                })
            });
            
            this.state.connectionStatus = response.ok ? 'connected' : 'limited';
        } catch (error) {
            this.state.connectionStatus = 'offline';
            console.warn('API connection check failed:', error);
        }
    }

    handleInputChange(e) {
        const input = e.target;
        const message = input.value;
        
        // Character limit enforcement
        if (message.length > this.config.maxMessageLength) {
            input.value = message.substring(0, this.config.maxMessageLength);
            this.showToast(`Message limited to ${this.config.maxMessageLength} characters`, 'warning');
            return;
        }
        
        // Auto-resize textarea
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        
        // Enable/disable send button
        this.sendButton.disabled = !message.trim() || this.state.isTyping;
        
        // Update character counter
        this.updateCharacterCounter(message.length);
    }

    updateCharacterCounter(count) {
        let counter = document.getElementById('characterCounter');
        if (!counter) {
            counter = document.createElement('div');
            counter.id = 'characterCounter';
            counter.style.cssText = `
                position: absolute;
                bottom: -20px;
                right: 0;
                font-size: 0.75rem;
                opacity: 0.6;
                color: white;
            `;
            this.messageInput.parentElement.style.position = 'relative';
            this.messageInput.parentElement.appendChild(counter);
        }
        
        counter.textContent = `${count}/${this.config.maxMessageLength}`;
        counter.style.color = count > this.config.maxMessageLength * 0.9 ? '#fbbf24' : 'rgba(255,255,255,0.6)';
    }

    displayWelcomeMessage() {
        if (!this.state.currentFriend) return;
        
        setTimeout(() => {
            this.addMessage(
                this.state.currentFriend.welcomeMessage,
                'ai',
                this.state.currentFriend.name,
                this.state.currentFriend.emoji
            );
        }, 1000);
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        // Validation
        if (!message || this.state.isTyping) return;
        if (!this.state.currentFriend) {
            this.showToast('Please select an AI friend first', 'warning');
            return;
        }
        
        // Rate limiting check (client-side)
        const now = Date.now();
        if (now - this.state.lastMessageTime < 1000) { // 1 second minimum
            this.showToast('Please wait a moment between messages', 'warning');
            return;
        }
        
        // Add user message to chat
        this.addMessage(message, 'user', 'You', 'You');
        
        // Clear input and reset
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.updateCharacterCounter(0);
        
        // Add to history
        this.state.chatHistory.push({ role: 'user', content: message });
        this.trimChatHistory();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await this.callAI(message);
            this.hideTypingIndicator();
            
            this.addMessage(
                response.message,
                'ai',
                this.state.currentFriend.name,
                this.state.currentFriend.emoji
            );
            
            // Add AI response to history
            this.state.chatHistory.push({ role: 'assistant', content: response.message });
            this.trimChatHistory();
            
            // Reset retry count on success
            this.state.retryCount = 0;
            this.state.lastMessageTime = now;
            
        } catch (error) {
            this.hideTypingIndicator();
            this.handleChatError(error, message);
        }
    }

    async callAI(message) {
        const requestBody = {
            message: message,
            friendData: {
                id: this.state.currentFriend.id,
                name: this.state.currentFriend.name,
                type: this.state.currentFriend.type,
                description: this.state.currentFriend.description,
                traits: this.state.currentFriend.traits,
                specialty: this.state.currentFriend.specialty
            },
            history: this.state.chatHistory.slice(-10), // Last 10 messages
            provider: this.config.currentProvider
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Provider': this.config.currentProvider
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new APIError(errorData.error || `HTTP ${response.status}`, response.status, errorData);
            }

            const data = await response.json();
            
            if (!data.message) {
                throw new Error('No response message received');
            }

            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try with a shorter message.');
            }
            
            throw error;
        }
    }

    handleChatError(error, originalMessage) {
        console.error('Chat error:', error);
        
        let errorMessage = "I'm having trouble connecting right now. Let me try again! 😊";
        let canRetry = false;

        if (error.status === 429) {
            errorMessage = "I'm getting too many requests right now. Please wait a moment! ⏰";
            canRetry = true;
        } else if (error.status === 503 || error.status === 502) {
            errorMessage = "The AI service is temporarily busy. Let me try again shortly! 🔄";
            canRetry = true;
        } else if (error.message.includes('timeout')) {
            errorMessage = "That took longer than expected. Let me try again! ⏱️";
            canRetry = true;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = "Connection issue detected. Checking your internet connection... 🌐";
            canRetry = true;
        }

        this.addMessage(errorMessage, 'ai', this.state.currentFriend.name, this.state.currentFriend.emoji);

        // Auto-retry logic
        if (canRetry && this.state.retryCount < this.config.retryAttempts) {
            this.state.retryCount++;
            const retryDelay = this.config.retryDelay * Math.pow(2, this.state.retryCount - 1);
            
            setTimeout(() => {
                this.addMessage(`Retrying... (${this.state.retryCount}/${this.config.retryAttempts}) 🔄`, 'system', 'System', '⚙️');
                this.retryMessage(originalMessage);
            }, retryDelay);
        } else if (this.state.retryCount >= this.config.retryAttempts) {
            this.addMessage(
                "I've tried several times but can't connect right now. Please try again in a few minutes! 💙", 
                'ai', 
                this.state.currentFriend.name, 
                this.state.currentFriend.emoji
            );
            this.state.retryCount = 0;
        }
    }

    async retryMessage(message) {
        this.showTypingIndicator();
        
        try {
            const response = await this.callAI(message);
            this.hideTypingIndicator();
            
            this.addMessage(
                response.message,
                'ai',
                this.state.currentFriend.name,
                this.state.currentFriend.emoji
            );
            
            this.state.chatHistory.push({ role: 'assistant', content: response.message });
            this.trimChatHistory();
            this.state.retryCount = 0;
            
        } catch (error) {
            this.hideTypingIndicator();
            this.handleChatError(error, message);
        }
    }

    addMessage(content, type, author, avatar) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-avatar" title="${author}">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${author}</span>
                    <span class="message-timestamp">${timestamp}</span>
                </div>
                <div class="message-text">${this.formatMessage(content)}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Mark as unread if not focused
        if (!this.messageInput.matches(':focus')) {
            this.markAsUnread();
        }
    }

    formatMessage(content) {
        // Basic formatting for better readability
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **bold**
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // *italic*
            .replace(/`(.*?)`/g, '<code>$1</code>') // `code`
            .replace(/\n/g, '<br>'); // line breaks
    }

    showTypingIndicator() {
        if (this.state.isTyping) return;
        
        this.state.isTyping = true;
        this.sendButton.disabled = true;
        this.sendButton.innerHTML = '<i class="fas fa-spinner spinner"></i>';
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message typing';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">${this.state.currentFriend.emoji}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${this.state.currentFriend.name} is thinking...</span>
                </div>
                <div class="typing-indicator">
                    <span>●</span><span>●</span><span>●</span>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.state.isTyping = false;
        this.sendButton.disabled = false;
        this.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom(smooth = true) {
        if (smooth) {
            this.chatMessages.scrollTo({
                top: this.chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        } else {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    trimChatHistory() {
        if (this.state.chatHistory.length > this.config.maxHistoryLength) {
            this.state.chatHistory = this.state.chatHistory.slice(-this.config.maxHistoryLength);
        }
    }

    markAsRead() {
        document.title = 'FriendiNeed - AI Life Companion';
    }

    markAsUnread() {
        document.title = '💬 New message - FriendiNeed';
    }

    switchFriend(friend) {
        this.state.currentFriend = friend;
        this.state.chatHistory = [];
        this.clearChat();
        
        // Update UI
        this.updateChatHeader(friend);
        this.updateInputPlaceholder(friend);
        this.updateQuickStarters(friend);
        
        // Show welcome message
        this.displayWelcomeMessage();
        
        console.log(`🤖 Switched to: ${friend.name}`);
    }

    updateChatHeader(friend) {
        const elements = {
            avatar: document.getElementById('currentFriendAvatar'),
            name: document.getElementById('currentFriendName'),
            description: document.getElementById('currentFriendDescription')
        };
        
        if (elements.avatar) elements.avatar.textContent = friend.emoji;
        if (elements.name) elements.name.textContent = friend.name;
        if (elements.description) elements.description.textContent = friend.description;
    }

    updateInputPlaceholder(friend) {
        const placeholders = {
            'The Comforter': 'Share what\'s on your heart...',
            'Career Coach': 'What professional challenge can I help with?',
            'Study Buddy': 'What subject are we tackling today?',
            'Fitness Coach': 'Ready to crush your fitness goals?',
            'The Honest One': 'What do you need honest feedback about?',
            'Finance Guru': 'What\'s your financial question?',
            'The Creative': 'What creative project inspires you?',
            'Mindfulness Guide': 'How can we find peace together?',
            'Relationship Advisor': 'What relationship topic shall we explore?',
            'The Chef': 'What delicious creation shall we make?'
        };
        
        this.messageInput.placeholder = placeholders[friend.name] || `Chat with ${friend.name}...`;
    }

    updateQuickStarters(friend) {
        const container = document.querySelector('.quick-starters');
        if (!container || !friend.quickStarters) return;
        
        container.innerHTML = friend.quickStarters.map(starter => 
            `<div class="quick-starter" data-message="${starter}">${starter}</div>`
        ).join('');
    }

    clearChat() {
        this.chatMessages.innerHTML = '';
        this.hideTypingIndicator();
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `notification ${type} show`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    // API Provider switching
    switchProvider(provider) {
        if (this.config.providers.includes(provider)) {
            this.config.currentProvider = provider;
            this.showToast(`Switched to ${provider.toUpperCase()} AI`, 'success');
            console.log(`🔄 Switched AI provider to: ${provider}`);
        }
    }

    // Export conversation
    exportConversation() {
        const conversation = this.state.chatHistory.map((msg, index) => ({
            timestamp: new Date().toISOString(),
            role: msg.role,
            content: msg.content,
            friend: msg.role === 'assistant' ? this.state.currentFriend.name : 'User'
        }));
        
        const blob = new Blob([JSON.stringify(conversation, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `friendineed-chat-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Conversation exported successfully!', 'success');
    }
}

// Custom error class for API errors
class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Enhanced friend management
class FriendManager {
    constructor(chatManager) {
        this.chatManager = chatManager;
        this.friends = []; // Will be populated from main file
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.renderFriendsGrid();
        this.setupFilterButtons();
        this.setupFriendSelection();
        console.log('👥 Friend manager initialized');
    }

    setFriends(friendsArray) {
        this.friends = friendsArray;
        this.renderFriendsGrid();
    }

    renderFriendsGrid() {
        const grid = document.getElementById('friendsGrid');
        if (!grid || !this.friends.length) return;
        
        const filteredFriends = this.currentFilter === 'all' 
            ? this.friends 
            : this.friends.filter(f => f.type === this.currentFilter);
        
        grid.innerHTML = filteredFriends.map(friend => `
            <div class="friend-card ${friend.id === 1 ? 'active' : ''}" 
                 data-friend-id="${friend.id}" 
                 data-type="${friend.type}"
                 role="button"
                 tabindex="0"
                 aria-label="Chat with ${friend.name}">
                <span class="friend-emoji" role="img" aria-label="${friend.name} emoji">${friend.emoji}</span>
                <div class="friend-name">${friend.name}</div>
                <div class="friend-type">${this.capitalizeFirst(friend.type)}</div>
                <div class="friend-description">${friend.description}</div>
                <div class="friend-traits">
                    ${friend.traits.map(trait => `<span class="trait">${trait}</span>`).join('')}
                </div>
                <div class="friend-status">
                    <span class="status-indicator online"></span>
                    <span class="status-text">Available</span>
                </div>
            </div>
        `).join('');
    }

    setupFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.currentFilter = btn.dataset.filter;
                this.renderFriendsGrid();
                this.setupFriendSelection(); // Re-setup after re-render
            });
        });
    }

    setupFriendSelection() {
        const friendCards = document.querySelectorAll('.friend-card');
        
        friendCards.forEach(card => {
            // Mouse click
            card.addEventListener('click', () => {
                this.selectFriend(card);
            });
            
            // Keyboard support
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectFriend(card);
                }
            });
        });
    }

    selectFriend(cardElement) {
        const friendId = parseInt(cardElement.dataset.friendId);
        const friend = this.friends.find(f => f.id === friendId);
        
        if (!friend) return;
        
        // Update UI
        document.querySelectorAll('.friend-card').forEach(card => {
            card.classList.remove('active');
        });
        cardElement.classList.add('active');
        
        // Notify chat manager
        this.chatManager.switchFriend(friend);
        
        // Scroll to chat interface
        this.scrollToChat();
        
        // Analytics tracking
        this.trackFriendSelection(friend);
    }

    scrollToChat() {
        const chatInterface = document.querySelector('.chat-interface');
        if (chatInterface) {
            chatInterface.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }

    trackFriendSelection(friend) {
        // Analytics tracking (implement based on your analytics solution)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'friend_selected', {
                friend_name: friend.name,
                friend_type: friend.type
            });
        }
        
        console.log(`📊 Friend selected: ${friend.name} (${friend.type})`);
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize enhanced system
let enhancedChatManager;
let friendManager;

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoadTime: 0,
            apiResponseTimes: [],
            errorCount: 0,
            messageCount: 0
        };
        this.init();
    }

    init() {
        // Measure page load time
        window.addEventListener('load', () => {
            this.metrics.pageLoadTime = performance.now();
            console.log(`📈 Page loaded in ${this.metrics.pageLoadTime.toFixed(2)}ms`);
        });

        // Monitor API response times
        this.monitorFetch();
    }

    monitorFetch() {
        const originalFetch = window.fetch;
        const self = this;

        window.fetch = function(...args) {
            const startTime = performance.now();
            
            return originalFetch.apply(this, args).then(response => {
                const endTime = performance.now();
                const responseTime = endTime - startTime;
                
                if (args[0].includes('/chat')) {
                    self.metrics.apiResponseTimes.push(responseTime);
                    console.log(`⏱️ API response time: ${responseTime.toFixed(2)}ms`);
                }
                
                return response;
            }).catch(error => {
                self.metrics.errorCount++;
                throw error;
            });
        };
    }

    getMetrics() {
        const avgResponseTime = this.metrics.apiResponseTimes.length > 0 
            ? this.metrics.apiResponseTimes.reduce((a, b) => a + b) / this.metrics.apiResponseTimes.length
            : 0;

        return {
            ...this.metrics,
            averageApiResponseTime: avgResponseTime,
            totalApiCalls: this.metrics.apiResponseTimes.length
        };
    }
}

// Enhanced app initialization
class EnhancedApp {
    constructor() {
        this.isInitialized = false;
        this.performanceMonitor = new PerformanceMonitor();
        this.init();
    }

    async init() {
        if (this.isInitialized) return;

        try {
            console.log('🚀 Initializing Enhanced FriendiNeed...');

            // Initialize Three.js background
            if (typeof initThreeJS === 'function') {
                initThreeJS();
            }

            // Initialize chat system
            enhancedChatManager = new EnhancedChatManager();
            
            // Initialize friend management
            friendManager = new FriendManager(enhancedChatManager);
            
            // Set friends data if available
            if (typeof friends !== 'undefined') {
                friendManager.setFriends(friends);
                enhancedChatManager.state.currentFriend = friends[0]; // Set default
            }

            // Initialize mobile menu
            this.initMobileMenu();

            // Initialize accessibility features
            this.initAccessibility();

            // Initialize service worker for offline support
            this.initServiceWorker();

            // Initialize analytics
            this.initAnalytics();

            this.isInitialized = true;
            console.log('✅ Enhanced FriendiNeed initialized successfully');

            // Show success notification
            setTimeout(() => {
                enhancedChatManager.showToast('Welcome to FriendiNeed! 🎉', 'success');
            }, 2000);

        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showFallbackInterface();
        }
    }

    initMobileMenu() {
        const toggle = document.getElementById('mobileMenuToggle');
        const navLinks = document.getElementById('navLinks');

        if (toggle && navLinks) {
            toggle.addEventListener('click', () => {
                navLinks.classList.toggle('show');
                toggle.classList.toggle('active');
                
                // Update aria attributes
                const isOpen = navLinks.classList.contains('show');
                toggle.setAttribute('aria-expanded', isOpen);
                navLinks.setAttribute('aria-hidden', !isOpen);
            });

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && navLinks.classList.contains('show')) {
                    navLinks.classList.remove('show');
                    toggle.classList.remove('active');
                    toggle.setAttribute('aria-expanded', false);
                    navLinks.setAttribute('aria-hidden', true);
                }
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
                    navLinks.classList.remove('show');
                    toggle.classList.remove('active');
                    toggle.setAttribute('aria-expanded', false);
                    navLinks.setAttribute('aria-hidden', true);
                }
            });
        }
    }

    initAccessibility() {
        // Add skip link for keyboard users
        const skipLink = document.createElement('a');
        skipLink.href = '#chatMessages';
        skipLink.textContent = 'Skip to chat';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 10000;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Announce page changes to screen readers
        const announcer = document.createElement('div');
        announcer.id = 'aria-announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(announcer);

        // Make chat messages accessible
        this.enhanceChatAccessibility();
    }

    enhanceChatAccessibility() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.setAttribute('role', 'log');
            chatMessages.setAttribute('aria-live', 'polite');
            chatMessages.setAttribute('aria-label', 'Chat conversation');
        }

        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.setAttribute('aria-label', 'Type your message');
            messageInput.setAttribute('aria-describedby', 'characterCounter');
        }
    }

    async initServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('🔧 Service worker registered');
            } catch (error) {
                console.log('Service worker registration failed:', error);
            }
        }
    }

    initAnalytics() {
        // Basic analytics tracking
        const analytics = {
            track: (event, data) => {
                console.log(`📊 Analytics: ${event}`, data);
                
                // Integration with Google Analytics, Mixpanel, etc.
                if (typeof gtag !== 'undefined') {
                    gtag('event', event, data);
                }
            }
        };

        // Track app initialization
        analytics.track('app_initialized', {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`
        });

        // Make analytics globally available
        window.friendiAnalytics = analytics;
    }

    showFallbackInterface() {
        // Show basic interface if enhanced features fail
        const fallback = document.createElement('div');
        fallback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
            z-index: 10000;
        `;
        
        fallback.innerHTML = `
            <h3>Welcome to FriendiNeed!</h3>
            <p>We're experiencing some technical difficulties, but the basic chat features are still available.</p>
            <button onclick="this.parentElement.remove()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">
                Continue with Basic Features
            </button>
        `;
        
        document.body.appendChild(fallback);
    }
}

// Offline support
class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.queuedMessages = [];
        this.init();
    }

    init() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueuedMessages();
            enhancedChatManager?.showToast('Connection restored! 🌐', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            enhancedChatManager?.showToast('You\'re offline. Messages will be sent when connection returns.', 'warning');
        });
    }

    queueMessage(message, friendData) {
        this.queuedMessages.push({ message, friendData, timestamp: Date.now() });
    }

    async processQueuedMessages() {
        if (!this.queuedMessages.length) return;

        enhancedChatManager?.showToast(`Sending ${this.queuedMessages.length} queued messages...`, 'info');

        for (const queuedMessage of this.queuedMessages) {
            try {
                await enhancedChatManager?.callAI(queuedMessage.message);
            } catch (error) {
                console.error('Failed to send queued message:', error);
            }
        }

        this.queuedMessages = [];
    }
}

// Theme manager for dark/light mode
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('friendineed-theme') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme();
        this.addThemeToggle();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('friendineed-theme', this.currentTheme);
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        
        enhancedChatManager?.showToast(
            `Switched to ${this.currentTheme} mode`, 
            'success'
        );
    }

    addThemeToggle() {
        const themeToggle = document.createElement('button');
        themeToggle.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
        themeToggle.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: none;
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        
        themeToggle.addEventListener('click', () => {
            this.toggleTheme();
            themeToggle.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
        });
        
        document.body.appendChild(themeToggle);
    }
}

// Voice input support (future feature)
class VoiceManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.init();
    }

    init() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.setupEventListeners();
            this.addVoiceButton();
        }
    }

    setupEventListeners() {
        if (!this.recognition) return;

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const messageInput = document.getElementById('messageInput');
            
            if (messageInput) {
                messageInput.value = transcript;
                messageInput.dispatchEvent(new Event('input'));
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            enhancedChatManager?.showToast('Voice input error. Please try again.', 'error');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateVoiceButton();
        };
    }

    addVoiceButton() {
        const voiceButton = document.createElement('button');
        voiceButton.innerHTML = '🎤';
        voiceButton.id = 'voiceButton';
        voiceButton.style.cssText = `
            position: absolute;
            right: 60px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            color: white;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        `;
        
        voiceButton.addEventListener('click', () => {
            this.toggleVoiceInput();
        });
        
        const chatInput = document.querySelector('.chat-input');
        if (chatInput) {
            chatInput.style.position = 'relative';
            chatInput.appendChild(voiceButton);
        }
    }

    toggleVoiceInput() {
        if (!this.recognition) return;

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
            this.isListening = true;
            this.updateVoiceButton();
            enhancedChatManager?.showToast('Listening... Speak now!', 'info');
        }
    }

    updateVoiceButton() {
        const button = document.getElementById('voiceButton');
        if (button) {
            button.innerHTML = this.isListening ? '🔴' : '🎤';
            button.style.background = this.isListening ? 
                'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)';
        }
    }
}

// Initialize everything when DOM is ready
function initializeEnhancedApp() {
    // Initialize core app
    window.enhancedApp = new EnhancedApp();
    
    // Initialize additional features
    window.offlineManager = new OfflineManager();
    window.themeManager = new ThemeManager();
    window.voiceManager = new VoiceManager();
    
    // Global error handling
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        if (enhancedChatManager) {
            enhancedChatManager.showToast('Something went wrong, but we\'re still here for you!', 'error');
        }
    });
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        event.preventDefault();
    });
    
    console.log('🎉 Enhanced FriendiNeed fully initialized!');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancedApp);
} else {
    initializeEnhancedApp();
}

// Export for external use
if (typeof window !== 'undefined') {
    window.EnhancedChatManager = EnhancedChatManager;
    window.FriendManager = FriendManager;
    window.initializeEnhancedApp = initializeEnhancedApp;
}