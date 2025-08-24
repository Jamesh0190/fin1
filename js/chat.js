// Chat functionality for FriendiNeed

// Chat state management
let isTyping = false;
let messageHistory = [];

// Demo conversation scenarios for different friend types
const demoScenarios = {
    work: [
        "I'm feeling really overwhelmed at work lately. My manager keeps piling on more tasks and I'm struggling to keep up. I don't know how to handle this without seeming incapable.",
        "I have a big presentation tomorrow and I'm terrified I'll mess it up. I've prepared a lot but I still feel like an imposter."
    ],
    emotional: [
        "I've been feeling really lonely lately. Most of my friends seem too busy to hang out and I'm starting to feel like maybe there's something wrong with me.",
        "My relationship ended last week and I'm struggling with a mix of sadness and relief. I don't know if what I'm feeling is normal."
    ],
    life: [
        "I'm thinking about making a big career change but I'm scared to leave my stable job. What if I'm making a huge mistake?",
        "I want to start exercising and eating better but I always lose motivation after a few days. How do I actually stick to healthy habits?"
    ],
    financial: [
        "I'm 25 and I haven't started saving for retirement yet. Every financial article I read makes me panic about being behind. Where do I even start?",
        "I keep spending money on things I don't need and then feeling guilty about it. How do I break this cycle?"
    ]
};

// Send message function
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (message === '' || isTyping) return;
    
    addMessage(message, 'user', 'You');
    input.value = '';
    messageHistory.push({ type: 'user', content: message });
    
    // Show typing indicator and respond
    showTypingIndicator();
    
    // Get appropriate response based on current friend
    setTimeout(() => {
        removeTypingIndicator();
        const response = generateContextualResponse(message);
        addMessage(response, 'ai', currentFriend.name);
        messageHistory.push({ type: 'ai', content: response });
    }, getRandomDelay());
}

// Generate contextual responses based on friend type and message content
function generateContextualResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    // Context-aware response selection
    if (message.includes('work') || message.includes('job') || message.includes('career')) {
        if (currentFriend.id === 'careercoach') {
            return getCareerSpecificResponse();
        }
    }
    
    if (message.includes('sad') || message.includes('lonely') || message.includes('depressed')) {
        if (currentFriend.id === 'comforter') {
            return getComfortingResponse();
        }
    }
    
    if (message.includes('study') || message.includes('exam') || message.includes('school')) {
        if (currentFriend.id === 'studybuddy') {
            return getStudyResponse();
        }
    }
    
    if (message.includes('money') || message.includes('budget') || message.includes('financial')) {
        if (currentFriend.id === 'moneywise') {
            return getFinancialResponse();
        }
    }
    
    // Default to random response from current friend
    return getRandomResponse();
}

// Specialized response functions
function getCareerSpecificResponse() {
    const careerResponses = [
        "Let's strategize your career path! Every challenge is a stepping stone to your professional growth. What specific aspect of work is weighing on you most right now? 💼",
        "I love career conversations! Your professional journey is unique to you. Whether it's networking, skill development, or workplace dynamics - let's tackle it together! 🚀",
        "Work stress is so real, but remember - you have more power than you think! Let's identify some actionable steps to improve your situation. What would success look like for you? ✨"
    ];
    return careerResponses[Math.floor(Math.random() * careerResponses.length)];
}

function getComfortingResponse() {
    const comfortResponses = [
        "Oh sweetheart, I can feel the weight you're carrying right now. Please know that you're not alone in this - I'm right here with you, and we'll get through this together. 💕",
        "My dear friend, your feelings are so valid and important. Sometimes we need permission to not be okay, and I'm giving you that permission right now. What would feel most comforting? 🫂",
        "I'm wrapping you in the warmest virtual hug right now. You're going through a difficult time, but please remember - this feeling won't last forever, and you're stronger than you know. 🌙"
    ];
    return comfortResponses[Math.floor(Math.random() * comfortResponses.length)];
}

function getStudyResponse() {
    const studyResponses = [
        "Study time! I love being your learning partner! 📚 What subject are we conquering today? Remember - consistency beats cramming every time!",
        "Academic challenges are just brain workouts in disguise! 💪 Let's break down whatever you're studying into manageable chunks. What's the trickiest concept right now?",
        "Learning is a journey, not a race! Every expert was once a beginner. What study method works best for your brain? Visual, auditory, or hands-on? 🎯"
    ];
    return studyResponses[Math.floor(Math.random() * studyResponses.length)];
}

function getFinancialResponse() {
    const financialResponses = [
        "Money talk - I'm here for it! 💰 Financial wellness is about progress, not perfection. What financial goal would make the biggest difference in your life right now?",
        "Let's make money less stressful and more empowering! Every small step toward financial health is worth celebrating. What area needs the most attention? 📊",
        "Financial planning is self-care for your future self! Whether it's budgeting, saving, or investing - we can create a plan that works for YOU. Where shall we start? 💡"
    ];
    return financialResponses[Math.floor(Math.random() * financialResponses.length)];
}

// Add message to chat
function addMessage(content, sender, name) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = sender === 'user' ? name.charAt(0).toUpperCase() : currentFriend.emoji;
    
    messageDiv.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="message-content">
            <span class="message-author">${name}</span>
            ${content}
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Typing indicator functions
function showTypingIndicator() {
    if (isTyping) return;
    
    isTyping = true;
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message typing-indicator';
    typingDiv.id = 'typingIndicator';
    
    typingDiv.innerHTML = `
        <div class="avatar">${currentFriend.emoji}</div>
        <div class="message-content">
            <span class="message-author">${currentFriend.name} is thinking</span>
            <div style="display: flex; gap: 6px; margin-top: 10px;">
                <div style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%; animation: pulse 1.4s ease-in-out infinite;"></div>
                <div style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%; animation: pulse 1.4s ease-in-out 0.2s infinite;"></div>
                <div style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%; animation: pulse 1.4s ease-in-out 0.4s infinite;"></div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
        isTyping = false;
    }
}

// Get random delay for more natural conversation flow
function getRandomDelay() {
    // Shorter delays for quick responses, longer for thoughtful ones
    const baseDelay = 1500;
    const randomVariation = Math.random() * 1000;
    return baseDelay + randomVariation;
}

// Handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Demo conversation starters
function startDemoConversation() {
    const scenarios = Object.values(demoScenarios).flat();
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    setTimeout(() => {
        addMessage(randomScenario, 'user', 'Demo User');
    }, 2000);
    
    setTimeout(() => {
        const response = generateContextualResponse(randomScenario);
        addMessage(response, 'ai', currentFriend.name);
    }, 4000);
}

// Predefined conversation starters for users
function addQuickResponse(response) {
    const input = document.getElementById('messageInput');
    input.value = response;
    input.focus();
}

// Quick response suggestions based on current friend
function getQuickResponses() {
    const responses = {
        emotional: [
            "I'm feeling overwhelmed lately",
            "I need some encouragement today",
            "I'm going through a tough time"
        ],
        situational: [
            "I need help with a decision",
            "Can you help me plan something?",
            "I want to improve in this area"
        ],
        personality: [
            "I want to try something new",
            "Let's have a fun conversation",
            "I need someone to talk to"
        ],
        lifestage: [
            "I'm dealing with big changes",
            "I need advice for my situation",
            "How do I handle this phase?"
        ],
        specialty: [
            "I want to learn something",
            "Help me solve this problem",
            "I need specialized advice"
        ]
    };
    
    return responses[currentFriend.category] || responses.emotional;
}

// Initialize chat system
function initializeChat() {
    const input = document.getElementById('messageInput');
    if (input) {
        input.addEventListener('keypress', handleKeyPress);
        
        // Set placeholder based on current friend
        updatePlaceholder();
    }
}

function updatePlaceholder() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    
    const placeholders = {
        listener: "Share what's on your heart...",
        adviser: "What challenge can I help you solve?",
        cheerleader: "What goal are we crushing today?",
        comforter: "How are you feeling right now?",
        honest: "What do you need honest feedback about?",
        problemsolver: "What problem shall we tackle together?",
        studybuddy: "What subject are we studying today?",
        careercoach: "What's your professional challenge?",
        workoutpartner: "Ready to get moving?",
        travelcompanion: "Where shall we explore?",
        parentally: "How's parenthood treating you?",
        petlover: "Tell me about your furry friends!",
        adventurer: "What adventure awaits us?",
        organiser: "What needs organizing in your life?",
        funny: "Ready for some laughs?",
        quiet: "What's in your peaceful thoughts?",
        intellectual: "What deep topic interests you?",
        socialconnector: "Want to talk about relationships?",
        newparent: "How are you adjusting to parenthood?",
        student: "What's your biggest student challenge?",
        entrepreneur: "What's your business vision?",
        moving: "How's the transition going?",
        recovery: "What positive change are you making?",
        mediator: "Need help with a conflict?",
        cultural: "What cultural topic fascinates you?",
        language: "What language are we practicing?",
        creative: "What wants to be created today?",
        mindfulness: "How can we find more presence?",
        moneywise: "What's your financial goal?"
    };
    
    input.placeholder = placeholders[currentFriend.id] || "Share what's on your mind...";
}

// Export functions for global use
if (typeof window !== 'undefined') {
    window.sendMessage = sendMessage;
    window.handleKeyPress = handleKeyPress;
    window.addQuickResponse = addQuickResponse;
    window.startDemoConversation = startDemoConversation;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sendMessage,
        addMessage,
        handleKeyPress,
        showTypingIndicator,
        removeTypingIndicator,
        generateContextualResponse,
        initializeChat,
        updatePlaceholder,
        startDemoConversation
    };
}