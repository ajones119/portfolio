import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const lenis = new Lenis();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time: number) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Export lenis instance so it can be accessed elsewhere
if (typeof window !== 'undefined') {
    (window as any).lenis = lenis;
}