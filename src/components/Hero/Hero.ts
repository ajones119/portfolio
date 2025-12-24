import gsap from 'gsap';

// Detect if screen is mobile
const isMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches || 
           window.innerWidth <= 768 ||
           'ontouchstart' in window;
};

interface HeroConfig {
    dots: HTMLElement[];
    button: HTMLElement;
    svg: HTMLElement;
    container: HTMLElement;
    bounceAnimation: gsap.core.Tween;
    dotsAngles: number[];
    svgGridSideLength: number;
    dotRadius: number;
    dotActiveRadius: number;
    dotsHoverRadius: number;
    dotsDownRadius: number;
    dotsUpRadius: number;
    dotsAnimationDuration: number;
    dotsAnimationDelay: number;
    getColorForIndex: (index: number) => string;
}

const initializeMobile = (config: HeroConfig) => {
    const {
        dots,
        svg,
        button,
        dotsAngles,
        svgGridSideLength,
        dotRadius,
        dotActiveRadius,
        dotsHoverRadius,
        dotsDownRadius,
        dotsUpRadius,
        dotsAnimationDuration,
        dotsAnimationDelay,
        getColorForIndex,
    } = config;

    // Animate dots to positions immediately on mobile
    dots.forEach((dot, index) => {
        const x = Math.cos(dotsAngles[index]) * dotsHoverRadius + svgGridSideLength/2;
        const y = Math.sin(dotsAngles[index]) * dotsHoverRadius + svgGridSideLength/2;
        gsap.to(dot, {
            attr: { cx: x, cy: y, fill: getColorForIndex(index), stroke: getColorForIndex(index) },
            duration: dotsAnimationDuration,
            ease: 'power2.inOut',
            delay: index * dotsAnimationDelay,
        });
    });

    // Continuously rotate SVG on mobile
    gsap.to(svg, {
        rotation: 360,
        transformOrigin: "center center",
        duration: 10,
        ease: 'none',
        repeat: -1,
    });

    // Button touch/mouse events
    const handleButtonDown = () => {
        dots.forEach((dot, index) => {
            const x = Math.cos(dotsAngles[index]) * dotsDownRadius + svgGridSideLength/2;
            const y = Math.sin(dotsAngles[index]) * dotsDownRadius + svgGridSideLength/2;
            gsap.to(dot, {
                attr: { cx: x, cy: y, fill: getColorForIndex(index), stroke: getColorForIndex(index), r: dotActiveRadius },
                duration: dotsAnimationDuration,
                ease: 'power2.inOut',
            });
        });
    };

    const handleButtonUp = () => {
        dots.forEach((dot, index) => {
            const x = Math.cos(dotsAngles[index]) * dotsUpRadius + svgGridSideLength/2;
            const y = Math.sin(dotsAngles[index]) * dotsUpRadius + svgGridSideLength/2;
            gsap.to(dot, {
                attr: { cx: x, cy: y, fill: getColorForIndex(index), stroke: getColorForIndex(index), r: dotRadius },
                duration: dotsAnimationDuration,
                ease: 'power2.inOut',
            });
        });
    };

    button.addEventListener('touchstart', handleButtonDown);
    button.addEventListener('touchend', handleButtonUp);
    button.addEventListener('mousedown', handleButtonDown);
    button.addEventListener('mouseup', handleButtonUp);
};

const initializeDesktop = (config: HeroConfig) => {
    const {
        dots,
        svg,
        button,
        container,
        bounceAnimation,
        dotsAngles,
        svgGridSideLength,
        dotRadius,
        dotActiveRadius,
        dotsHoverRadius,
        dotsDownRadius,
        dotsUpRadius,
        dotsAnimationDuration,
        dotsAnimationDelay,
        getColorForIndex,
    } = config;

    // Container mouse events
    container.addEventListener('mouseenter', () => {
        bounceAnimation.pause();
        dots.forEach((dot, index) => {
            const x = Math.cos(dotsAngles[index]) * dotsHoverRadius + svgGridSideLength/2;
            const y = Math.sin(dotsAngles[index]) * dotsHoverRadius + svgGridSideLength/2;
            gsap.to(dot, {
                attr: { cx: x, cy: y, fill: getColorForIndex(index), stroke: getColorForIndex(index) },
                duration: dotsAnimationDuration,
                ease: 'power2.inOut',
                delay: index * dotsAnimationDelay,
            });
        });
    });

    container.addEventListener('mouseleave', () => {
        bounceAnimation.play();
        dots.forEach((dot, index) => {
            gsap.to(dot, {
                attr: { cx: svgGridSideLength/2, cy: svgGridSideLength/2 },
                duration: dotsAnimationDuration,
                ease: 'power2.inOut',
                delay: index * dotsAnimationDelay,
            });
        });
    });

    // Button mouse events
    button.addEventListener('mouseenter', () => {
        bounceAnimation.pause();
    });

    button.addEventListener('mouseleave', () => {
        console.log('mouseleave');
    });

    // Button press/release with rotation
    const handleButtonDown = () => {
        dots.forEach((dot, index) => {
            const x = Math.cos(dotsAngles[index]) * dotsDownRadius + svgGridSideLength/2;
            const y = Math.sin(dotsAngles[index]) * dotsDownRadius + svgGridSideLength/2;
            gsap.to(dot, {
                attr: { cx: x, cy: y, fill: getColorForIndex(index), stroke: getColorForIndex(index), r: dotActiveRadius },
                duration: dotsAnimationDuration,
                ease: 'power2.inOut',
            });
        });
        gsap.to(svg, {
            rotation: 360,
            transformOrigin: "center center",
            duration: dotsAnimationDuration,
            ease: 'power2.inOut',
        });
    };

    const handleButtonUp = () => {
        dots.forEach((dot, index) => {
            const x = Math.cos(dotsAngles[index]) * dotsUpRadius + svgGridSideLength/2;
            const y = Math.sin(dotsAngles[index]) * dotsUpRadius + svgGridSideLength/2;
            gsap.to(dot, {
                attr: { cx: x, cy: y, fill: getColorForIndex(index), stroke: getColorForIndex(index), r: dotRadius },
                duration: dotsAnimationDuration,
                ease: 'power2.inOut',
            });
        });
        gsap.to(svg, {
            rotation: 0,
            transformOrigin: "center center",
            duration: dotsAnimationDuration,
            ease: 'power2.inOut',
        });
    };

    button.addEventListener('mousedown', handleButtonDown);
    button.addEventListener('mouseup', handleButtonUp);

    // SVG mouse events
    svg.addEventListener('mouseleave', () => {
        bounceAnimation.resume();
    });
};

export const initNextSectionButton = () => {
    // Animate the container, let the <a> tag handle its own color transitions
    const container = document.getElementById('next-section-button-container') as HTMLElement;
    if (container) {
        gsap.set(container, {
            y: 0,
            force3D: true // Use transform3d for better performance
        });
        
        // Store the bounce animation so we can pause/resume it
        const bounceAnimation = gsap.to(container, {
            y: 10,
            duration: 1,
            ease: 'circ.in',
            repeat: -1,
            yoyo: true,
            delay: 0.25,
            force3D: true // Keep transforms on GPU
        });

        // Animate dots
        const dots = gsap.utils.toArray<HTMLElement>('.dot');
        const flashes = gsap.utils.toArray<HTMLElement>('.flash');
        
        // Initialize flash elements (hidden and at center)
        if (flashes.length > 0) {
            flashes.forEach(flash => {
                gsap.set(flash, {
                    attr: { r: 0 },
                });
            });
        }
        const button = container.querySelector('a') as HTMLElement;
        const svg = document.getElementById('hero-svg') as HTMLElement;
        if (dots.length > 0 && button) {
            // Get CSS variable colors once
            const root = document.documentElement;
            const computedStyle = getComputedStyle(root);
            const secondaryColor = computedStyle.getPropertyValue('--color-secondary').trim();
            const tertiaryColor = computedStyle.getPropertyValue('--color-tertiary').trim();
            const quaternaryColor = computedStyle.getPropertyValue('--color-quaternary').trim();
            const svgGridSideLength = 48;

            // Angles in radians
            const dotsAngles = dots.map((dot, index) => {
                const angle = index * (360 / dots.length) * (Math.PI/180);
                return angle;
            });

            // Constants
            const dotRadius = 0.5;
            const dotActiveRadius = 1;
            const dotsHoverRadius = 10;
            const dotsDownRadius = 8;
            const dotsUpRadius = 12;
            const dotsAnimationDuration = 0.08;
            const dotsAnimationDelay = 0.05;

            // Color assignment function
            const getColorForIndex = (index: number): string => {
                const colors = [secondaryColor, tertiaryColor, quaternaryColor];
                return colors[index % colors.length];
            };

            // Set dots to center of svg first
            dots.forEach((dot) => {
                gsap.set(dot, {
                    attr: { cx: svgGridSideLength/2, cy: svgGridSideLength/2, r: dotRadius },
                });
            });

            // Create config object
            const config: HeroConfig = {
                dots,
                button,
                svg,
                container,
                bounceAnimation,
                dotsAngles,
                svgGridSideLength,
                dotRadius,
                dotActiveRadius,
                dotsHoverRadius,
                dotsDownRadius,
                dotsUpRadius,
                dotsAnimationDuration,
                dotsAnimationDelay,
                getColorForIndex,
            };

            // Initialize based on device type
            if (isMobile()) {
                initializeMobile(config);
            } else {
                initializeDesktop(config);
            }

            // Common click handler
            button.addEventListener('click', () => {
                console.log('3. Click');
            });
        }   
    }
}

export const initHero = () => {
    initNextSectionButton();
}