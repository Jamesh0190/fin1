// Main application logic for FriendiNeed

// Application state
let appState = {
    isInitialized: false,
    currentModal: null,
    mobileMenuOpen: false,
    user: null
};

// Initialize the application
function initializeApp() {
    if (appState.isInitialized) return;
    
    console.log('🚀 Initializing FriendiNeed App...');
    
    try {
        // Initialize friends system
        if (typeof renderFriendsGrid === 'function') {
            renderFriendsGrid();
        }
        
        // Initialize chat system
        if (typeof initializeChat === 'function') {
            initializeChat();
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize mobile menu
        initializeMobileMenu();
        
        // Set up modal system
        initializeModals();
        
        // Start demo conversation after delay
        setTimeout(startDemoConversation, 3000);
        
        appState.isInitialized = true;
        console.log('✅ FriendiNeed App initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
    }
}

// Set up global event listeners
function setupEventListeners() {
    // Global click handler for modal closing
    window.addEventListener('click', handleGlobalClick);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Resize handler
    window.addEventListener('resize', debounce(handleWindowResize, 250));
    
    // Error handling
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledPromiseRejection);
}

// Handle global clicks (modal closing, etc.)
function handleGlobalClick(event) {
    // Close modal when clicking outside
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
    
    // Handle mobile menu clicks
    if (appState.mobileMenuOpen && !event.target.closest('nav')) {
        closeMobileMenu();
    }
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(event) {
    // Escape key closes modals
    if (event.key === 'Escape') {
        if (appState.currentModal) {
            closeModal(appState.currentModal);
        }
        if (appState.mobileMenuOpen) {
            closeMobileMenu();
        }
    }
    
    // Ctrl/Cmd + K for quick friend search (future feature)
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        // Future: Open friend search modal
        console.log('Quick friend search (coming soon!)');
    }
}

// Handle window resize
function handleWindowResize() {
    // Close mobile menu on desktop
    if (window.innerWidth > 768 && appState.mobileMenuOpen) {
        closeMobileMenu();
    }
    
    // Adjust chat container height on mobile
    adjustChatHeight();
}

// Adjust chat container height for mobile
function adjustChatHeight() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    if (window.innerWidth <= 768) {
        const vh = window.innerHeight * 0.01;
        chatMessages.style.height = Math.min(400, window.innerHeight * 0.4) + 'px';
    } else {
        chatMessages.style.height = '480px';
    }
}

// Mobile menu functionality
function initializeMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (!mobileToggle || !navLinks) return;
    
    mobileToggle.addEventListener('click', toggleMobileMenu);
    
    // Close menu when clicking on nav links
    navLinks.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            closeMobileMenu();
        }
    });
}

function toggleMobileMenu() {
    if (appState.mobileMenuOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

function openMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navLinks) {
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.background = 'rgba(15, 23, 42, 0.98)';
        navLinks.style.padding = '2rem';
        navLinks.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
        navLinks.style.backdropFilter = 'blur(20px)';
    }
    
    if (mobileToggle) {
        mobileToggle.classList.add('active');
    }
    
    appState.mobileMenuOpen = true;
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    
    if (navLinks && window.innerWidth <= 768) {
        navLinks.style.display = 'none';
    }
    
    if (mobileToggle) {
        mobileToggle.classList.remove('active');
    }
    
    appState.mobileMenuOpen = false;
    document.body.style.overflow = 'auto';
}

// Modal system
function initializeModals() {
    // Add modal backdrop click handlers
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Add close button handlers
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal ${modalId} not found`);
        return;
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    appState.currentModal = modalId;
    
    // Focus first input in modal
    const firstInput = modal.querySelector('input');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
    
    // Add modal opening animation
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.transform = 'scale(0.7)';
        modalContent.style.opacity = '0';
        setTimeout(() => {
            modalContent.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            modalContent.style.transform = 'scale(1)';
            modalContent.style.opacity = '1';
        }, 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.transform = 'scale(0.7)';
        modalContent.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            modalContent.style.transform = 'scale(1)';
            modalContent.style.opacity = '1';
            modalContent.style.transition = '';
        }, 300);
    } else {
        modal.style.display = 'none';
    }
    
    document.body.style.overflow = 'auto';
    appState.currentModal = null;
}

// Form handling
function handleSignup() {
    const email = document.getElementById('email')?.value?.trim();
    const name = document.getElementById('name')?.value?.trim();
    const interests = document.getElementById('interests')?.value?.trim();
    
    // Validation
    if (!email || !name) {
        showNotification('Please fill in your email and name so your AI friends know how to welcome you! 😊', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address.', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('#authModal .cta-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating your account...';
    submitBtn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        showSuccessMessage(name, interests);
        closeModal('authModal');
        clearForm('authModal');
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }, 1500);
}

function showSuccessMessage(name, interests) {
    const message = `🎉 Welcome to FriendiNeed, ${name}!\n\nYour AI companions are excited to meet you! You'll receive:\n\n💌 A welcome email with getting started tips\n🤗 Your first personalized conversation\n🎁 Access to all free features immediately\n✨ A 7-day premium trial to explore all 29 friends\n\nYour interests: "${interests || 'making new connections'}"\n\nWelcome to the FriendiNeed family! 💕`;
    
    showNotification(message, 'success');
}

function clearForm(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.querySelectorAll('input').forEach(input => {
        input.value = '';
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? 'var(--error)' : type === 'success' ? 'var(--success)' : 'var(--primary)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        white-space: pre-line;
        font-size: 0.9rem;
        line-height: 1.5;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, type === 'success' ? 8000 : 5000);
    
    // Click to dismiss
    notification.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Error handling
function handleGlobalError(event) {
    console.error('Global error:', event.error);
    // Don't show error notifications for demo purposes
    // In production, you might want to log to an error service
}

function handleUnhandledPromiseRejection(event) {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
}

// Demo conversation starter
function startDemoConversation() {
    if (typeof addMessage !== 'function') return;
    
    const demoMessages = [
        "I've been feeling really overwhelmed with everything going on in my life lately. Work is super stressful, I'm barely sleeping, and I feel like I'm not doing enough in any area. Do you think you could help me figure out how to manage all this?",
        "I'm thinking about making a big career change but I'm terrified of making the wrong choice. Everyone expects me to have it all figured out, but honestly, I feel lost.",
        "I want to start taking better care of myself - eating well, exercising, having better relationships - but I always start strong and then give up after a few days. How do I actually stick to positive changes?"
    ];
    
    const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)];
    
    setTimeout(() => {
        addMessage(randomMessage, 'user', 'Demo User');
    }, 2000);
    
    setTimeout(() => {
        if (typeof generateContextualResponse === 'function') {
            const response = generateContextualResponse(randomMessage);
            addMessage(response, 'ai', currentFriend?.name || 'Your AI Friend');
        }
    }, 4500);
}

// Export global functions
if (typeof window !== 'undefined') {
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.handleSignup = handleSignup;
    window.showNotification = showNotification;
    window.toggleMobileMenu = toggleMobileMenu;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApp,
        openModal,
        closeModal,
        handleSignup,
        showNotification,
        isValidEmail,
        debounce
    };
}