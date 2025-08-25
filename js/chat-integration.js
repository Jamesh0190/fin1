// js/chat-integration.js - Fixed version with comprehensive error handling

class ChatManager {
    constructor() {
        this.currentFriend = null;
        this.chatHistory = [];
        this.isTyping = false;
        this.chatContainer = null;
        this.chatInput = null;
        this.sendButton = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.initializeChat();
    }

    initializeChat() {
        console.log('🚀 Initializing chat system...');
        
        // Find chat elements
        this.chatContainer = document.getElementById('chatMessagesPreview') || 
                           document.getElementById('chatMessages');
        
        this.chatInput = document.querySelector('.chat-input-preview input') || 
                        document.getElementById('messageInput');
        
        this.sendButton = document.querySelector('.chat-input-preview button') ||
                         document.querySelector('#sendButton');
        
        if (!this.chatInput || !this.sendButton) {
            console.log('⏳ Chat elements not found, retrying in 1 second...');
            setTimeout(() => this.initializeChat(), 1000);
            return;
        }

        this.setupEventListeners();
        this.setDefaultFriend();
        this.displayWelcomeMessage();
        
        console.log('✅ Chat system initialized successfully');
    }

    setupEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Enter key to send
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Friend selection from cards
        document.addEventListener('click', (e) => {
            if (e.target.closest('.select-friend-btn')) {
                const friendId = e.target.dataset.id;
                const friend = friends.find(f => f.id == friendId);
                if (friend) {
                    this.setCurrentFriend(friend);
                    this.scrollToChat();
                    
                    // Update visual indicator
                    this.updateFriendCardSelection(friendId);
                }
            }
        });

        // Input validation
        this.chatInput.addEventListener('input', (e) => {
            const message = e.target.value;
            if (message.length > 500) {
                e.target.value = message.substring(0, 500);
                this.showToast('Message too long! Please keep it under 500 characters.', 'warning');
            }
        });
    }

    setDefaultFriend() {
        const defaultFriend = friends.find(f => f.name === 'The Comforter') || friends[0];
        if (defaultFriend) {
            this.setCurrentFriend(defaultFriend);
        }
    }

    setCurrentFriend(friend) {
        console.log(`🤖 Switching to: ${friend.name}`);
        this.currentFriend = friend;
        this.clearChatHistory();
        this.updateChatPlaceholder();
        this.displayWelcomeMessage();
        this.retryCount = 0; // Reset retry count for new friend
        
        // Global compatibility
        if (typeof window !== 'undefined') {
            window.currentFriend = friend;
        }
    }

    updateFriendCardSelection(friendId) {
        // Remove previous selection
        document.querySelectorAll('.friend-card').forEach(card => {
            card.classList.remove('current-friend');
        });
        
        // Add selection to current friend
        const selectedCard = document.querySelector(`.select-friend-btn[data-id="${friendId}"]`)?.closest('.friend-card');
        if (selectedCard) {
            selectedCard.classList.add('current-friend');
        }
    }

    scrollToChat() {
        const heroSection = document.querySelector('.hero');
        if (heroSection) {
            heroSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    updateChatPlaceholder() {
        if (!this.chatInput || !this.currentFriend) return;
        
        const placeholders = {
            'The Comforter': 'Share what\'s weighing on your heart...',
            'Career Coach': 'What professional challenge can I help with?',
            'Study Buddy': 'What subject are we tackling today?',
            'Fitness Coach': 'Ready to crush your fitness goals?',
            'The Honest One': 'What do you need honest feedback about?',
            'Finance Guru': 'What\'s your financial question?',
            'The Creative': 'What creative project inspires you?',
            'Mindfulness Guide': 'How can we find peace together?',
            'Relationship Advisor': 'What relationship topic shall we explore?',
            'The Chef': 'What delicious creation shall we make?',
            'Tech Support': 'What tech challenge can I solve?',
            'The Adventurer': 'What adventure are you dreaming of?',
            'The Strategist': 'What challenge needs strategic thinking?',
            'The Motivator': 'What goal are we crushing today?',
            'The Organizer': 'What area of life needs organizing?'
        };
        
        this.chatInput.placeholder = placeholders[this.currentFriend.name] || 
                                   `Chat with ${this.currentFriend.name}...`;
    }

    clearChatHistory() {
        this.chatHistory = [];
        if (this.chatContainer) {
            this.chatContainer.innerHTML = '';
        }
    }

    displayWelcomeMessage() {
        if (!this.currentFriend) return;
        
        const welcomeMessage = this.currentFriend.welcomeMessage || 
            `Hi! I'm ${this.currentFriend.name}. ${this.currentFriend.description} How can I help you today?`;
        
        this.displayMessage(welcomeMessage, 'ai');
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isTyping) return;

        // Validate message
        if (message.length > 500) {
            this.showToast('Message too long! Please keep it under 500 characters.', 'error');
            return;
        }

        // Display user message
        this.displayMessage(message, 'user');
        this.chatInput.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await this.callOpenAI(message);
            this.hideTypingIndicator();
            this.displayMessage(response, 'ai');
            this.retryCount = 0; // Reset on success
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Chat error:', error);
            this.handleChatError(error, message);
        }
    }

    async callOpenAI(message) {
        console.log('🚀 Calling OpenAI API...');
        console.log('Friend:', this.currentFriend?.name);
        console.log('Message length:', message.length);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    friendData: {
                        id: this.currentFriend.id,
                        name: this.currentFriend.name,
                        description: this.currentFriend.description,
                        traits: this.currentFriend.traits,
                        type: this.currentFriend.type,
                        specialty: this.currentFriend.specialty
                    }
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

            const data = await response.json();
            console.log('📦 Response data:', data);

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.message) {
                throw new Error('No message in response');
            }

            return data.message;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            
            console.error('API call failed:', error);
            throw error;
        }
    }

    handleChatError(error, originalMessage) {
        let errorMessage = 'I\'m having trouble connecting right now. Please try again in a moment! 😊';
        let canRetry = false;

        if (error.message.includes('timeout') || error.message.includes('network')) {
            errorMessage = 'Connection timeout. Please check your internet and try again. 🌐';
            canRetry = true;
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
            errorMessage = 'I\'m getting too many requests right now. Please wait a moment! ⏰';
            canRetry = true;
        } else if (error.message.includes('500')) {
            errorMessage = 'Something went wrong on my end. Let me try to reconnect... 🔄';
            canRetry = true;
        } else if (error.message.includes('API key')) {
            errorMessage = 'There\'s a configuration issue. Please contact support. 🛠️';
        }

        this.displayMessage(errorMessage, 'ai');

        // Auto-retry logic
        if (canRetry && this.retryCount < this.maxRetries) {
            this.retryCount++;
            setTimeout(() => {
                this.displayMessage(`Retrying... (attempt ${this.retryCount}/${this.maxRetries}) 🔄`, 'system');
                this.showTypingIndicator();
                this.callOpenAI(originalMessage)
                    .then(response => {
                        this.hideTypingIndicator();
                        this.displayMessage(response, 'ai');
                        this.retryCount = 0;
                    })
                    .catch(retryError => {
                        this.hideTypingIndicator();
                        if (this.retryCount >= this.maxRetries) {
                            this.displayMessage('I\'ve tried several times but can\'t connect. Please try again later! 😅', 'ai');
                        } else {
                            this.handleChatError(retryError, originalMessage);
                        }
                    });
            }, 2000 * this.retryCount); // Exponential backoff
        }
    }

    displayMessage(message, type) {
        if (!this.chatContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message-preview ${type === 'user' ? 'user' : type === 'system' ? 'system' : ''}`;
        
        let avatar, author;
        
        if (type === 'user') {
            avatar = 'You';
            author = 'You';
        } else if (type === 'system') {
            avatar = '⚙️';
            author = 'System';
        } else {
            avatar = this.currentFriend ? this.currentFriend.emoji : '🤖';
            author = this.currentFriend ? this.currentFriend.name : 'AI Friend';
        }
        
        messageDiv.innerHTML = `
            <div class="avatar-preview">${avatar}</div>
            <div class="message-content-preview">
                <span class="message-author-preview">${author}</span>
                <span>${message}</span>
            </div>
        `;
        
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        
        // Add to history (limit to prevent memory issues)
        this.chatHistory.push({ message, type, timestamp: new Date() });
        if (this.chatHistory.length > 50) {
            this.chatHistory = this.chatHistory.slice(-30);
        }
    }

    showTypingIndicator() {
        if (this.isTyping || !this.chatContainer) return;
        
        this.isTyping = true;
        this.sendButton.disabled = true;
        this.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message-preview typing-indicator';
        typingDiv.id = 'typing-indicator';
        
        typingDiv.innerHTML = `
            <div class="avatar-preview">${this.currentFriend ? this.currentFriend.emoji : '🤖'}</div>
            <div class="message-content-preview">
                <span class="message-author-preview">${this.currentFriend ? this.currentFriend.name : 'AI Friend'} is thinking...</span>
                <div class="typing-dots">
                    <span>●</span><span>●</span><span>●</span>
                </div>
            </div>
        `;
        
        this.chatContainer.appendChild(typingDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.sendButton.disabled = false;
        this.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }
}

// Enhanced CSS for animations and styling
const enhancedStyles = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .typing-indicator .typing-dots {
        display: flex;
        gap: 4px;
        margin-top: 8px;
    }

    .typing-indicator .typing-dots span {
        animation: typing-pulse 1.4s ease-in-out infinite;
        color: rgba(255, 255, 255, 0.6);
    }

    .typing-indicator .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
    .typing-indicator .typing-dots span:nth-child(3) { animation-delay: 0s; }

    @keyframes typing-pulse {
        0%, 80%, 100% {
            opacity: 0.3;
            transform: scale(1);
        }
        40% {
            opacity: 1;
            transform: scale(1.2);
        }
    }
    
    .message-preview.system {
        opacity: 0.8;
        font-style: italic;
    }
    
    .message-preview.system .message-content-preview {
        background: rgba(156, 163, 175, 0.2);
        border-color: rgba(156, 163, 175, 0.3);
    }
    
    .chat-input-preview button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

// Inject enhanced styles
if (!document.querySelector('#enhanced-chat-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'enhanced-chat-styles';
    styleSheet.textContent = enhancedStyles;
    document.head.appendChild(styleSheet);
}

// Initialize when ready
let chatManager = null;

function initializeChatSystem() {
    if (chatManager) return;
    
    chatManager = new ChatManager();
    window.chatManager = chatManager;
    window.sendMessage = () => chatManager.sendMessage();
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChatSystem);
} else {
    initializeChatSystem();
}

// Export
if (typeof window !== 'undefined') {
    window.ChatManager = ChatManager;
    window.initializeChatSystem = initializeChatSystem;
}