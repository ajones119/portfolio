import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';


export const navbar = () => {
    const navbar = document.querySelector('nav');
    if (!navbar) return;

    // Check if navbar has already been animated in this session
    const hasAnimated = sessionStorage.getItem('navbar-animated');
    
    if (hasAnimated) {
        // Already animated, just set to visible immediately
        gsap.set(navbar, {
            opacity: 1
        });
    } else {
        // First time - fade in
        gsap.set(navbar, {
            opacity: 0
        });
        gsap.to(navbar, {
            opacity: 1,
            duration: 1,
            ease: 'power2.inOut',
            onComplete: () => {
                // Mark as animated after animation completes
                sessionStorage.setItem('navbar-animated', 'true');
            }
        });
    }
}