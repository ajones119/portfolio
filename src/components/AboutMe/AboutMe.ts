import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export const animateAboutMeCards = (props: {progress: number, enterStartProgress: number, enterEndProgress: number, exitStartProgress: number, exitEndProgress: number}) => {
    console.log('animate about me cards');
    const { progress, enterStartProgress, enterEndProgress, exitStartProgress, exitEndProgress } = props;
    // Look inside the page-about-me container (the actual page layer)
    const cards = gsap.utils.toArray('#page-about-me .page-card, #page-about-me .nav-card') as HTMLElement[];
    const navCards = gsap.utils.toArray('#page-about-me .nav-card') as HTMLElement[];
    
    // Filter out center image (about-card-5) - it stays visible always
    const cardsToAnimate = cards.filter((card, index) => {
        // Skip center image card (index 4 in the page-card list, or check for about-card-5 class)
        return !card.classList.contains('about-card-5');
    });

    if (cardsToAnimate.length === 0) return;

    if (progress >= enterStartProgress && progress <= enterEndProgress) {
        console.log('animate about me cards enter', progress, enterStartProgress, enterEndProgress);
        cards.forEach((card, index) => {
            //if center image card, skip
            const cardElement = card as HTMLElement;
            gsap.to(cardElement, {
                opacity: 1,
                duration: 0.81,
                ease: 'power2.inOut',
                delay: 0,
            });
            
        });
    }
    else if (progress >= exitStartProgress && progress <= exitEndProgress) {
        console.log('animate about me cards exit', progress, exitStartProgress, exitEndProgress);
        cards.forEach((card, index) => {
            if (index !== 4) {
                const cardElement = card as HTMLElement;
                gsap.to(cardElement, {
                    opacity: 0,
                    duration: 0.81,
                    ease: 'power2.inOut',
                    delay: 0,
                });
            }
        });
    }
}

export const gridAnimations = (progress: number) => {
    if (typeof document === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    const container = document.getElementById('about-me') as HTMLElement;

    console.log('progress: ', progress);
}

export const initWaveAnimation = () => {
    if (typeof document === 'undefined') return;
    
    // Find the SVG element
    const container = document.getElementById('about-me-background-container');
    const svg = container?.querySelector('svg') as SVGElement | null;
    
    if (!svg) {
        // Wait for SVG to load
        setTimeout(() => {
            const container = document.getElementById('about-me-background-container');
            const svg = container?.querySelector('svg') as SVGElement | null;
            if (svg) animateWaves(svg);
        }, 100);
        return;
    }
    
    animateWaves(svg);

   

    
};

export const initMaskedSections = () => {
    const container = document.getElementById('about-me-background-container');
    const containerWidth = container?.clientWidth || 0;
    if (containerWidth > 1024) {
        initCursorClipPath();
    } else {
        //initMaskedClipPathSections();
    }
}

const initCursorClipPath = () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    
    gsap.registerPlugin(ScrollTrigger);
    
    const container = document.getElementById('about-me-background-container') as HTMLElement;
    const section = document.getElementById('about-me') as HTMLElement;
    if (!container || !section) return;
    
    // Track mouse position
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    
    // Max radius is 20px
    const MAX_RADIUS = 40;
    
    // Current radius (animated)
    let currentRadius = 0;
    let scrollRadius = 0; // Radius from scroll
    let mouseRadius = 0; // Additional radius from mouse hover
    
    // Calculate clip path position based on cursor
    const updateClipPath = () => {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Calculate center position from cursor
        const centerX = mouseX;
        const centerY = mouseY;
        
        // Total radius is scroll radius + mouse radius (capped at MAX_RADIUS)
        currentRadius = Math.min(MAX_RADIUS, scrollRadius + mouseRadius);
        
        // Constrain center to keep circle within bounds (using current radius for constraints)
        const constrainedX = Math.max(currentRadius, Math.min(windowWidth - currentRadius, centerX));
        const constrainedY = Math.max(currentRadius, Math.min(windowHeight - currentRadius, centerY));
        
        // Update clip-path: circle(radius at x y)
        container.style.clipPath = `circle(${currentRadius}px at ${constrainedX}px ${constrainedY}px)`;
    };
    
    // Smooth mouse tracking with GSAP
    const handleMouseMove = (e: MouseEvent) => {
        targetX = e.clientX;
        targetY = e.clientY;
    };
    
    // Handle mouse enter section - expand circle
    const handleMouseEnter = () => {
        gsap.to({ value: mouseRadius }, {
            value: MAX_RADIUS - scrollRadius, // Fill remaining space up to max
            duration: 0.6,
            ease: 'power2.out',
            onUpdate: function() {
                mouseRadius = this.targets()[0].value;
                updateClipPath();
            }
        });
    };
    
    // Handle mouse leave section - contract circle (but keep scroll radius)
    const handleMouseLeave = () => {
        gsap.to({ value: mouseRadius }, {
            value: 0,
            duration: 0.4,
            ease: 'power2.in',
            onUpdate: function() {
                mouseRadius = this.targets()[0].value;
                updateClipPath();
            }
        });
    };
    
    // ScrollTrigger to grow circle during first 25% of section scroll
    ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'top -25%', // First 25% of section
        //scrub: true,
        onUpdate: (self) => {
            // Progress goes from 0 to 1 over first 25% of scroll
            scrollRadius = self.progress * MAX_RADIUS;
            updateClipPath();
        }
    });
    
    // Update on mouse move with smooth interpolation
    window.addEventListener('mousemove', handleMouseMove);
    
    // Add enter/exit listeners to the section
    section.addEventListener('mouseenter', handleMouseEnter);
    section.addEventListener('mouseleave', handleMouseLeave);
    
    // Smooth animation loop
    gsap.ticker.add(() => {
        // Smooth interpolation for position
        mouseX += (targetX - mouseX) * 0.1;
        mouseY += (targetY - mouseY) * 0.1;
        updateClipPath();
    });
    
    // Initial position (center) and radius (0)
    targetX = window.innerWidth / 2;
    targetY = window.innerHeight / 2;
    mouseX = targetX;
    mouseY = targetY;
    currentRadius = 0;
    scrollRadius = 0;
    mouseRadius = 0;
    updateClipPath();
};

const animateWaves = (svg: SVGElement) => {
    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    // Get all path elements (the waves)
    const paths = Array.from(svg.querySelectorAll('path'));
    if (paths.length === 0) return;

    // Create continuous wave animation for each path
    paths.forEach((path, index) => {
        const pathElement = path as SVGPathElement;
        
        // Get the original path data
        const originalPath = pathElement.getAttribute('d');
        if (!originalPath) return;

        // Parse the path to extract points
        // For wave animation, we'll animate the Y coordinates of the path points
        // Method: Transform the path using CSS transforms for performance
        
        // Animate each wave with different timing and amplitude for depth
        const amplitude = 15 + (index * 5); // Varying wave heights
        const duration = 4 + (index * 0.3); // Slightly different speeds
        const delay = index * 0.15; // Stagger the waves

        // Continuous wave motion using sine animation
        gsap.to(pathElement, {
            y: `+=${amplitude}`,
            duration: duration,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            delay: delay,
        });

        // Also add subtle horizontal translation for more organic movement
        gsap.to(pathElement, {
            x: `+=${10 + index * 2}`,
            duration: duration * 1.5,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            delay: delay * 0.5,
        });

        // Optional: Tie wave intensity to scroll position
        ScrollTrigger.create({
            trigger: '#about-me',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1,
            onUpdate: (self) => {
                // Increase wave amplitude slightly as you scroll
                //const scrollProgress = self.progress;
                //const extraAmplitude = scrollProgress * 5;
                
                // You can adjust transform based on scroll if desired
                // For now, we'll keep the continuous animation
            }
        });
    });
};

const initMaskedClipPathSections = () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const sections = document.querySelectorAll('#grid-content > *');
    if (sections.length === 0) return;

    sections.forEach((section) => {
        const sectionElement = section as HTMLElement;
        sectionElement.style.clipPath = `circle(0px at 50% 50%)`;
        gsap.to(sectionElement, {
            clipPath: `circle(100% at 50% 50%)`,
            duration: 1,
            ease: 'power2.inOut'
        });
    }); 

    // add mask to the container but no mouse interaction
    const container = document.getElementById('about-me-background-container') as HTMLElement;
    if (container) {
        container.style.clipPath = `circle(0px at 50% 50%)`;
        // unmask section 3 and 5 by setting the clip path on them to none
        const section3 = document.querySelector('.grid-item-3') as HTMLElement;
        const section5 = document.querySelector('.grid-item-5') as HTMLElement;
        if (section3) {
            section3.style.clipPath = `none`;
        }
        if (section5) {
            section5.style.clipPath = `none`;
        }
    }
}

