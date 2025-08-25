// js/chat-integration.js - Enhanced version that works with existing code

class ChatManager {
    constructor() {
        this.currentFriend = null;
        this.chatHistory = [];
        this.isTyping = false;
        this.chatContainer = null;
        this.chatInput = null;
        this.sendButton = null;
        this.initializeChat();
    }

    initializeChat() {
        console.log('🚀 Initializing enhanced chat system...');
        
        // Find chat elements - supporting both preview and main chat
        this.chatContainer = document.getElementById('chatMessagesPreview') || 
                           document.getElementById('chatMessages');
        
        this.chatInput = document.querySelector('.chat-input-preview input') || 
                        document.getElementById('messageInput');
        
        this.sendButton = document.querySelector('.chat-input-preview button') ||
                         document.querySelector('#sendButton');
        
        if (!this.chatInput || !this.sendButton) {
            console.log('Chat elements not found, waiting for DOM...');
            // Retry after a short delay
            setTimeout(() => this.initializeChat(), 1000);
            return;
        }

        // Set up event listeners
        this.setupEventListeners();
        
        // Set default friend
        this.setDefaultFriend();
        
        // Display welcome message
        this.displayWelcomeMessage();
        
        console.log('✅ Chat system initialized successfully');
    }

    setupEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Enter key to send message
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Listen for friend selection from existing code
        document.addEventListener('click', (e) => {
            if (e.target.closest('.select-friend-btn')) {
                const friendId = e.target.dataset.id;
                const friend = friends.find(f => f.id == friendId);
                if (friend) {
                    this.setCurrentFriend(friend);
                    // Scroll to chat area
                    const heroSection = document.querySelector('.hero');
                    if (heroSection) {
                        heroSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            }
        });

        // Listen for filter changes to update friend selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                // Reset to first available friend when filter changes
                setTimeout(() => {
                    const firstVisibleCard = document.querySelector('.friend-card:not([style*="display: none"])');
                    if (firstVisibleCard) {
                        const friendId = firstVisibleCard.querySelector('.select-friend-btn')?.dataset.id;
                        const friend = friends.find(f => f.id == friendId);
                        if (friend && friend.id !== this.currentFriend?.id) {
                            this.setCurrentFriend(friend);
                        }
                    }
                }, 100);
            }
        });
    }

    setDefaultFriend() {
        // Set The Comforter as default, or first available friend
        const defaultFriend = friends.find(f => f.name === 'The Comforter') || friends[0];
        if (defaultFriend) {
            this.setCurrentFriend(defaultFriend);
        }
    }

    setCurrentFriend(friend) {
        console.log(`🤖 Switching to friend: ${friend.name}`);
        this.currentFriend = friend;
        this.clearChatHistory();
        this.updateChatPlaceholder();
        this.displayWelcomeMessage();
        
        // Update global currentFriend variable for compatibility
        if (typeof window !== 'undefined') {
            window.currentFriend = friend;
        }
    }

    updateChatPlaceholder() {
        if (!this.chatInput || !this.currentFriend) return;
        
        const placeholders = {
            'The Comforter': 'Share what\'s in your heart...',
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

        // Display user message
        this.displayMessage(message, 'user');
        this.chatInput.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await this.callOpenAI(message);
            this.hideTypingIndicator();
            this.displayMessage(response, 'ai');
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Chat error:', error);
            this.displayMessage(
                "I'm having trouble connecting right now. Please try again in a moment! 😊", 
                'ai'
            );
        }
    }

    async callOpenAI(message) {
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                friendData: this.currentFriend
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        return data.message;
    }

    displayMessage(message, type) {
        if (!this.chatContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message-preview ${type === 'user' ? 'user' : ''}`;
        
        const avatar = type === 'user' ? 'You' : (this.currentFriend ? this.currentFriend.emoji : '🤖');
        const author = type === 'user' ? 'You' : (this.currentFriend ? this.currentFriend.name : 'AI Friend');
        
        messageDiv.innerHTML = `
            <div class="avatar-preview">${avatar}</div>
            <div class="message-content-preview">
                <span class="message-author-preview">${author}</span>
                <span>${message}</span>
            </div>
        `;
        
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        
        // Add to chat history
        this.chatHistory.push({ message, type, timestamp: new Date() });
        
        // Limit chat history to prevent memory issues
        if (this.chatHistory.length > 50) {
            this.chatHistory = this.chatHistory.slice(-30);
        }
    }

    showTypingIndicator() {
        if (this.isTyping || !this.chatContainer) return;
        
        this.isTyping = true;
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
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}

// Enhanced CSS styles for typing indicator
const typingStyles = `
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
`;

// Inject typing styles
if (!document.querySelector('#typing-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'typing-styles';
    styleSheet.textContent = typingStyles;
    document.head.appendChild(styleSheet);
}

// Initialize chat when DOM is loaded
let chatManager = null;

function initializeChatSystem() {
    if (chatManager) return; // Prevent multiple initializations
    
    chatManager = new ChatManager();
    
    // Make globally accessible
    window.chatManager = chatManager;
    window.sendMessage = () => chatManager.sendMessage();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChatSystem);
} else {
    initializeChatSystem();
}

// Export for compatibility
if (typeof window !== 'undefined') {
    window.ChatManager = ChatManager;
    window.initializeChatSystem = initializeChatSystem;
}