// Background animations and visual effects

// Data point animation system
class DataPointAnimator {
    constructor() {
        this.container = null;
        this.dataPoints = [];
        this.animationId = null;
        this.isRunning = false;
        this.spawnRate = 800; // milliseconds between spawns
        this.maxPoints = 15; // maximum points on screen
        this.lastSpawn = 0;
    }

    init() {
        this.container = document.querySelector('.animated-background');
        if (!this.container) {
            console.warn('Animated background container not found');
            return;
        }
        this.start();
    }

    createDataPoint() {
        if (this.dataPoints.length >= this.maxPoints) return null;

        const dataPoint = document.createElement('div');
        dataPoint.className = 'data-point';
        
        // Random positioning and timing
        const startX = Math.random() * window.innerWidth;
        const animationDuration = (Math.random() * 4 + 6) * 1000; // 6-10 seconds
        const animationDelay = Math.random() * 2000; // 0-2 second delay
        
        // Set styles
        dataPoint.style.left = startX + 'px';
        dataPoint.style.animationDuration = animationDuration + 'ms';
        dataPoint.style.animationDelay = animationDelay + 'ms';
        
        // Add random color variation
        const colors = [
            'var(--primary-light)',
            'var(--accent)',
            'var(--secondary)'
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        dataPoint.style.background = randomColor;
        
        // Random size variation
        const size = Math.random() * 4 + 4; // 4-8px
        dataPoint.style.width = size + 'px';
        dataPoint.style.height = size + 'px';
        
        // Add to container
        this.container.appendChild(dataPoint);
        this.dataPoints.push({
            element: dataPoint,
            createdAt: Date.now(),
            duration: animationDuration + animationDelay
        });
        
        // Clean up after animation completes
        setTimeout(() => {
            this.removeDataPoint(dataPoint);
        }, animationDuration + animationDelay);
        
        return dataPoint;
    }

    removeDataPoint(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
        
        // Remove from tracking array
        this.dataPoints = this.dataPoints.filter(point => point.element !== element);
    }

    spawnDataPoint() {
        const now = Date.now();
        if (now - this.lastSpawn >= this.spawnRate) {
            this.createDataPoint();
            this.lastSpawn = now;
            
            // Vary spawn rate slightly for more natural feel
            this.spawnRate = 800 + Math.random() * 400; // 800-1200ms
        }
    }

    animate() {
        if (!this.isRunning) return;
        
        this.spawnDataPoint();
        
        // Clean up expired data points
        this.cleanupExpiredPoints();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    cleanupExpiredPoints() {
        const now = Date.now();
        this.dataPoints = this.dataPoints.filter(point => {
            if (now - point.createdAt > point.duration + 1000) {
                this.removeDataPoint(point.element);
                return false;
            }
            return true;
        });
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        
        // Create initial batch of data points
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.createDataPoint();
            }, i * 200);
        }
        
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Clean up all data points
        this.dataPoints.forEach(point => {
            this.removeDataPoint(point.element);
        });
        this.dataPoints = [];
    }

    pause() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    resume() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }
}

// Intersection Observer for performance optimization
class AnimationObserver {
    constructor(animator) {
        this.animator = animator;
        this.observer = null;
        this.isVisible = true;
        this.init();
    }

    init() {
        // Only run animations when page is visible
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isVisible) {
                    this.isVisible = true;
                    this.animator.resume();
                } else if (!entry.isIntersecting && this.isVisible) {
                    this.isVisible = false;
                    this.animator.pause();
                }
            });
        });

        // Observe the main container
        const mainContainer = document.body;
        if (mainContainer) {
            this.observer.observe(mainContainer);
        }

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.animator.pause();
                this.isVisible = false;
            } else {
                this.animator.resume();
                this.isVisible = true;
            }
        });
    }
}

// Smooth scrolling enhancements
function initSmoothScrolling() {
    // Enhanced smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                const headerHeight = document.querySelector('header')?.offsetHeight || 0;
                const targetPosition = target.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Scroll-triggered animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements that should animate on scroll
    const animatedElements = document.querySelectorAll('.feature-card, .pricing-card, .section-header');
    
    animatedElements.forEach(el => {
        // Set initial state
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        observer.observe(el);
    });
}

// Header scroll effects
function initHeaderEffects() {
    const header = document.querySelector('header');
    if (!header) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateHeader() {
        const scrollY = window.scrollY;
        
        if (scrollY > 100) {
            header.style.background = 'rgba(15, 23, 42, 0.95)';
            header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
        } else {
            header.style.background = 'rgba(15, 23, 42, 0.9)';
            header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        }

        // Hide header when scrolling down, show when scrolling up
        if (scrollY > lastScrollY && scrollY > 200) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }

        lastScrollY = scrollY;
        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick);
}

// Button hover effects
function initButtonEffects() {
    document.querySelectorAll('.cta-btn').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Friend card selection animations
function initFriendCardAnimations() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.friend-card')) {
            const card = e.target.closest('.friend-card');
            
            // Add selection ripple effect
            const ripple = document.createElement('div');
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(37, 99, 235, 0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            const rect = card.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            
            card.style.position = 'relative';
            card.appendChild(ripple);
            
            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 600);
        }
    });
    
    // Add ripple animation keyframes
    if (!document.querySelector('#ripple-animation')) {
        const style = document.createElement('style');
        style.id = 'ripple-animation';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Chat message animations
function initChatAnimations() {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;

    // Observer for new messages
    const messageObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.classList.contains('message')) {
                    // Animate new message
                    node.style.opacity = '0';
                    node.style.transform = 'translateY(20px)';
                    
                    requestAnimationFrame(() => {
                        node.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        node.style.opacity = '1';
                        node.style.transform = 'translateY(0)';
                    });
                }
            });
        });
    });

    messageObserver.observe(chatContainer, { childList: true });
}

// Loading animations
function initLoadingAnimations() {
    // Add loading animation for images
    document.querySelectorAll('img').forEach(img => {
        if (!img.complete) {
            img.style.opacity = '0';
            img.addEventListener('load', function() {
                this.style.transition = 'opacity 0.3s ease';
                this.style.opacity = '1';
            });
        }
    });
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.fps = 60;
        this.lastTime = performance.now();
        this.monitoring = false;
    }

    start() {
        this.monitoring = true;
        this.monitor();
    }

    monitor() {
        if (!this.monitoring) return;

        const now = performance.now();
        const delta = now - this.lastTime;
        
        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastTime = now;
            
            // Adjust animation quality based on performance
            this.adjustAnimationQuality();
        }
        
        this.frameCount++;
        requestAnimationFrame(() => this.monitor());
    }

    adjustAnimationQuality() {
        const dataPointAnimator = window.dataPointAnimator;
        if (!dataPointAnimator) return;

        if (this.fps < 30) {
            // Reduce animation quality for better performance
            dataPointAnimator.spawnRate = 1200;
            dataPointAnimator.maxPoints = 8;
        } else if (this.fps > 50) {
            // Increase animation quality
            dataPointAnimator.spawnRate = 600;
            dataPointAnimator.maxPoints = 20;
        }
    }

    stop() {
        this.monitoring = false;
    }
}

// Reduced motion support
function respectReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    function handleReducedMotion(e) {
        if (e.matches) {
            // Disable or reduce animations
            document.documentElement.style.setProperty('--animation-duration', '0.1s');
            if (window.dataPointAnimator) {
                window.dataPointAnimator.stop();
            }
        } else {
            // Re-enable animations
            document.documentElement.style.removeProperty('--animation-duration');
            if (window.dataPointAnimator) {
                window.dataPointAnimator.start();
            }
        }
    }
    
    // Check initial preference
    handleReducedMotion(prefersReducedMotion);
    
    // Listen for changes
    prefersReducedMotion.addEventListener('change', handleReducedMotion);
}

// Initialize all animations
function initializeAnimations() {
    // Create and start data point animator
    window.dataPointAnimator = new DataPointAnimator();
    window.animationObserver = new AnimationObserver(window.dataPointAnimator);
    window.performanceMonitor = new PerformanceMonitor();
    
    // Initialize all animation systems
    window.dataPointAnimator.init();
    window.performanceMonitor.start();
    
    // Initialize other animations
    initSmoothScrolling();
    initScrollAnimations();
    initHeaderEffects();
    initButtonEffects();
    initFriendCardAnimations();
    initChatAnimations();
    initLoadingAnimations();
    respectReducedMotion();
    
    console.log('✨ Animations initialized successfully');
}

// Cleanup function
function cleanupAnimations() {
    if (window.dataPointAnimator) {
        window.dataPointAnimator.stop();
    }
    if (window.performanceMonitor) {
        window.performanceMonitor.stop();
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.initializeAnimations = initializeAnimations;
    window.cleanupAnimations = cleanupAnimations;
    
    // Auto-initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAnimations);
    } else {
        initializeAnimations();
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanupAnimations);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DataPointAnimator,
        AnimationObserver,
        PerformanceMonitor,
        initializeAnimations,
        cleanupAnimations,
        initSmoothScrolling,
        initScrollAnimations,
        initHeaderEffects,
        initButtonEffects,
        initFriendCardAnimations,
        initChatAnimations
    };
}