import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initFreelanceCards() {
	const wrapper = document.getElementById('freelance-cards');
	if (!wrapper) return;

	const cards = gsap.utils.toArray<HTMLElement>('[data-freelance-card]', wrapper);
	if (cards.length === 0) return;

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	if (reducedMotion) {
		gsap.set(cards, { opacity: 1, y: 0 });
		return;
	}

	gsap.set(cards, { opacity: 0, y: 16 });

	ScrollTrigger.create({
		trigger: wrapper,
		start: 'top 85%',
		once: true,
		onEnter: () => {
			gsap.to(cards, {
				opacity: 1,
				y: 0,
				duration: 0.6,
				stagger: 0.1,
				ease: 'power3.out',
			});
		},
	});
}
