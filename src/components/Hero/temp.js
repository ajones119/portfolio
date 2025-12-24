import gsap from 'gsap';

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
        if (dots.length > 0 && button) {
            // Get CSS variable colors once
            const root = document.documentElement;
            const computedStyle = getComputedStyle(root);
            const secondaryColor = computedStyle.getPropertyValue('--color-secondary').trim();
            const tertiaryColor = computedStyle.getPropertyValue('--color-tertiary').trim();
            const quaternaryColor = computedStyle.getPropertyValue('--color-quaternary').trim();
            
            // Color assignment: 2 secondary, 2 tertiary, 2 quaternary
            const getColorForIndex = (index: number): string => {
                const colors = [secondaryColor, tertiaryColor, quaternaryColor];
                return colors[index % colors.length];
            };

            button.addEventListener('mouseenter', () => {
                // Pause the bounce animation on hover
                bounceAnimation.pause();
            });

            button.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent navigation if you want
                
                // Get container dimensions for flash expansion
                const svg = document.getElementById('hero-svg') as HTMLElement;

                // Master timeline: flash first, then explosion
                const masterTl = gsap.timeline();
                
                // Phase 1: Flash expands to boundary (scales outward to reach boundary points)
                if (flashes.length > 0) {
                    
                    masterTl.to(flashes, {
                        attr: { r: 14 },
                        opacity: 1,
                        duration: 0.3,
                        ease: 'power2.out',
                    });
                    
                    // Phase 2: Flash scales back down to center (will overlap with dots)
                    masterTl.to(flashes, {
                        attr: { r: 0 },
                        opacity: 0,
                        duration: 0.2,
                        ease: 'power2.in',
                    });
                    
                    // Phase 3: Dots explosion starts here, overlapping with flash collapse
                    // The "-=0.1" makes dots start 0.1s before flash finishes collapsing
                    masterTl.add(() => {
                        dots.forEach((dot, index) => {
                            const targetColor = getColorForIndex(index);
                            
                            // Even distribution around circle with slight randomness
                            const angle = (index / dots.length) * Math.PI * 2 + gsap.utils.random(-0.2, 0.2);
                            const distance = gsap.utils.random(20, 30); // Fixed pixel distance
                            const x = Math.cos(angle) * distance/2;
                            const y = Math.sin(angle) * distance/2;
                            
                            // Create a timeline for each dot
                            const tl = gsap.timeline();
                            
                            // Phase 1: Gentle spread with colors
                            tl.to(dot, {
                                x: x,
                                y: y,
                                attr: { r: gsap.utils.random(0.3, 1.75) }, // Subtle scale increase
                                fill: targetColor,
                                stroke: targetColor,
                                duration: 0.5,
                                ease: 'power2.out', // Gentler easing
                            })
                            // Phase 2: Fade and shrink
                            /*.to(dot, {
                                attr: { r: 0 },
                                opacity: 0,
                                duration: 0.4,
                                ease: 'power1.in',
                            }, "-=0.1") // Overlap slightly*/
                            //new fast 2, rotate svg container 360deg
                            .to(svg, {
                                rotation: 360,
                                duration: 8,
                                ease: 'power2.out',
                            }, "<")
                            // Phase 3: Instantly reset
                            .call(() => {
                                gsap.set(dot, {
                                    x: 0,
                                    y: 0,
                                    rotation: 0,
                                    attr: { r: 0.5 },
                                    opacity: 1,
                                    fill: 'currentColor',
                                    stroke: 'currentColor',
                                });
                            });
                        });
                    }, "-=0.2"); // Overlap: start dots 0.1s before flash collapse finishes
                    
                    // Reset flash after it's done collapsing (after overlap period)
                    masterTl.call(() => {
                        flashes.forEach(flash => {
                            gsap.set(flash, {
                                attr: { r: 0 },
                                opacity: 0,
                            });
                        });
                        gsap.set(svg, {
                            rotation: 0,
                        });
                    });
                }
            });


            button.addEventListener('mouseleave', () => {
                // Resume the bounce animation when mouse leaves
                bounceAnimation.resume();
            });
        }   
    }
}

export const initHero = () => {
    initNextSectionButton();
}
























            // Calculate angles in RADIANS (Math.cos/sin require radians)
            const dotsAngles = dots.map((dot, index) => {
                const angleDegrees = index * (360 / dots.length);
                const angleRadians = angleDegrees * (Math.PI / 180); // Convert to radians
                return angleRadians;
            });
            
            // Color assignment: evenly distribute colors
            // For 12 dots: 4 of each color (secondary, tertiary, quaternary)
            const getColorForIndex = (index: number): string => {
                const colors = [secondaryColor, tertiaryColor, quaternaryColor];
                const colorIndex = Math.floor(index / (dots.length / colors.length));
                return colors[colorIndex % colors.length];
            };

            svg.addEventListener('mouseenter', () => {
                // Pause the bounce animation on hover
                bounceAnimation.pause();

                //dots sequentially animate to angle positions with a radius of 20
                dots.forEach((dot, index) => {
                    const angle = dotsAngles[index];
                    const radius = 20;
                    const centerX = svgGridSideLength / 2;
                    const centerY = svgGridSideLength / 2;
                    const x = Math.cos(angle) * radius + centerX;
                    const y = Math.sin(angle) * radius + centerY;
                    
                    gsap.to(dot, {
                        attr: { 
                            cx: x, 
                            cy: y,
                            fill: getColorForIndex(index), 
                            stroke: getColorForIndex(index) 
                        },
                        duration: 0.1,
                        ease: 'power2.inOut',
                        delay: index * 0.05, // Stagger the animations
                    });
                })
            });