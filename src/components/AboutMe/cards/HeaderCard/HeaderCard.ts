import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { SnakeGame } from './Snake';

gsap.registerPlugin(ScrollTrigger);

let snakeGame: SnakeGame | null = null;

export const initCanvas = () => {
    const card = document.querySelector("#header-card") as HTMLElement;
    const canvasWrapper = document.querySelector("#snake-canvas-wrapper") as HTMLElement;
    const canvas = document.querySelector("#snake-canvas") as HTMLCanvasElement;
    const startButton = document.querySelector("#snake-start-btn") as HTMLButtonElement;
    const toggleButton = document.querySelector("#snake-toggle-btn") as HTMLButtonElement;
    
    if (!canvas || !card || !canvasWrapper) return;

    let isCanvasVisible = false;

    // Handle resize and size initialization
    const setupCanvas = () => {
        const rect = card.getBoundingClientRect();
        const padding = 40; // 20px padding on each side
        const maxWidth = rect.width - padding;
        const maxHeight = rect.height - padding;
        
        // Calculate best fit - maintain aspect ratio and fit within padded area
        const targetTiles = 20;
        const gridSize = Math.floor(Math.min(maxWidth, maxHeight) / targetTiles);
        
        // Calculate actual canvas size (must be multiple of gridSize for perfect fit)
        const tileCountX = Math.floor(maxWidth / gridSize);
        const tileCountY = Math.floor(maxHeight / gridSize);
        canvas.width = tileCountX * gridSize;
        canvas.height = tileCountY * gridSize;
        
        // Initialize or resize snake game
        if (snakeGame) {
            snakeGame.resize();
        } else {
            snakeGame = new SnakeGame(canvas);
        }
    };

    // Initial setup
    setupCanvas();
    
    // Resize on window resize
    window.addEventListener('resize', setupCanvas);
    
    // Toggle button handler
    if (toggleButton) {
        const showIcon = document.querySelector("#snake-toggle-icon-show") as HTMLElement;
        const hideIcon = document.querySelector("#snake-toggle-icon-hide") as HTMLElement;
        
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card hover events
            isCanvasVisible = !isCanvasVisible;
            
            if (isCanvasVisible) {
                canvasWrapper.classList.remove('hidden');
                // Update icon
                if (showIcon) showIcon.classList.add('hidden');
                if (hideIcon) hideIcon.classList.remove('hidden');
                // Setup canvas when shown (will be ready for start button)
                setupCanvas();
                // Show start button when canvas is shown
                if (startButton) {
                    startButton.style.display = 'block';
                    startButton.textContent = 'Press Start to Play (WASD)';
                }
            } else {
                canvasWrapper.classList.add('hidden');
                // Update icon
                if (showIcon) showIcon.classList.remove('hidden');
                if (hideIcon) hideIcon.classList.add('hidden');
                // Stop the game when canvas is hidden
                if (snakeGame && snakeGame.isRunning()) {
                    snakeGame.stop();
                }
            }
        });
    }
    
    // Start button handler
    if (startButton) {
        startButton.addEventListener('click', () => {
            if (snakeGame) {
                snakeGame.start();
                startButton.style.display = 'none';
            }
        });
    }
    
    return snakeGame;
}

export const initHeaderCard = () => {
    const card = document.querySelector("#header-card") as HTMLElement;
    const element = document.querySelector(".split") as HTMLElement;
    const canvas = document.querySelector("#snake-canvas") as HTMLCanvasElement;
    const toggleButton = document.querySelector("#snake-toggle-btn") as HTMLElement;
    
    if (!element) return;

    // Get the text content
    const text = element.textContent || '';
    
    // Clear the element
    element.textContent = '';
    
    // Split text into characters and wrap each in a span
    const chars = text.split('').map(char => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char; // Use non-breaking space for regular spaces
        span.style.display = 'inline-block';
        element.appendChild(span);
        return span;
    });

    // Animate the characters in a staggered fashion
    gsap.from(chars, {
        duration: 1,
        y: 30,
        autoAlpha: 0,
        stagger: 0.05,
        ease: "power2.out",
        scrollTrigger: {
            trigger: element,
            start: 'top 80%',
            toggleActions: 'play none none none',
        }
    });

    // Animate toggle button fade in on scroll
    if (toggleButton) {
        // Check if button is visible (not hidden on mobile)
        const isVisible = window.getComputedStyle(toggleButton).display !== 'none';
        
        if (isVisible) {
            gsap.to(toggleButton, {
                opacity: 1,
                duration: 0.6,
                ease: "power2.out",
                delay: 0.5, // 1/2 second delay
                scrollTrigger: {
                    trigger: card,
                    start: 'top 80%',
                    toggleActions: 'play none none none',
                }
            });
        }
    }

    let waveTimeline: gsap.core.Timeline | null = null;

    card.addEventListener('mouseenter', () => {
        // Kill any existing animation
        if (waveTimeline) {
            waveTimeline.kill();
        }

        // Create a smooth wave animation that loops
        waveTimeline = gsap.timeline({ repeat: -1 });
        waveTimeline.to(chars, {
            duration: 0.5,
            y: -10,
            stagger: 0.05,
            ease: "power2.out"
        });
        waveTimeline.to(chars, {
            duration: 0.5,
            y: 0,
            stagger: 0.05,
            ease: "power2.in"
        });
    });

    card.addEventListener('mouseleave', () => {
        // Kill the wave animation
        if (waveTimeline) {
            waveTimeline.kill();
            waveTimeline = null;
        }

        // Return all characters to origin smoothly
        gsap.to(chars, {
            duration: 0.5,
            y: 0,
            stagger: 0.02,
            ease: "power2.out"
        });
    });
}