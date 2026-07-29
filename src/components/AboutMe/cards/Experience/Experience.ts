import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type StackLayout = {
	x: number;
	y: number;
	rotation: number;
	scale: number;
	zIndex: number;
};

const STACK_LAYOUTS: Record<number, StackLayout> = {
	0: { x: -44, y: 10, rotation: -16, scale: 0.82, zIndex: 1 },
	1: { x: -20, y: 4, rotation: -7, scale: 0.9, zIndex: 2 },
	2: { x: 10, y: -4, rotation: 3, scale: 1, zIndex: 3 },
};

const OPEN_LAYOUT: StackLayout = {
	x: 0,
	y: -6,
	rotation: 0,
	scale: 1.15,
	zIndex: 10,
};

function getInner(tile: HTMLElement): HTMLElement | null {
	return tile.querySelector('.experience-tile-inner');
}

function getStackIndex(tile: HTMLElement) {
	return Number(tile.dataset.stackIndex ?? '0');
}

function getLayout(tile: HTMLElement) {
	return STACK_LAYOUTS[getStackIndex(tile)] ?? STACK_LAYOUTS[0];
}

function applyLayout(
	target: HTMLElement,
	layout: StackLayout,
	immediate = false,
) {
	const vars = {
		x: layout.x,
		y: layout.y,
		rotation: layout.rotation,
		scale: layout.scale,
		zIndex: layout.zIndex,
	};

	if (immediate) {
		gsap.set(target, vars);
		return;
	}

	gsap.to(target, {
		...vars,
		duration: 0.28,
		ease: 'power3.out',
		overwrite: 'auto',
	});
}

function applyFlip(inner: HTMLElement, flipped: boolean, reducedMotion: boolean) {
	gsap.to(inner, {
		rotationY: flipped ? 180 : 0,
		duration: reducedMotion ? 0 : 0.45,
		ease: 'power3.inOut',
		overwrite: 'auto',
	});
}

function initMobileList(root: HTMLElement) {
	const items = gsap.utils.toArray<HTMLElement>(
		'[data-experience-list-item]',
		root,
	);
	if (items.length === 0) return () => {};

	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	if (reducedMotion) {
		gsap.set(items, { opacity: 1, y: 0 });
		return () => {};
	}

	gsap.set(items, { opacity: 0, y: 12 });

	const trigger = ScrollTrigger.create({
		trigger: root,
		start: 'top 88%',
		once: true,
		onEnter: () => {
			gsap.to(items, {
				opacity: 1,
				y: 0,
				duration: 0.55,
				stagger: 0.08,
				ease: 'power3.out',
			});
		},
	});

	return () => {
		trigger.kill();
		gsap.set(items, { clearProps: 'opacity,y' });
	};
}

function initDesktopStack(root: HTMLElement) {
	const stack = root.querySelector('[data-experience-stack]');
	if (!stack) return;

	const tiles = gsap.utils.toArray<HTMLElement>('[data-experience-tile]', stack);
	if (tiles.length === 0) return;

	let openTile: HTMLElement | null = null;
	let idleTweens: gsap.core.Tween[] = [];
	let hoverEnabled = false;
	let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const stopIdle = () => {
		idleTweens.forEach((tween) => tween.kill());
		idleTweens = [];
	};

	const startIdle = () => {
		if (reducedMotion || openTile) return;

		stopIdle();

		tiles.forEach((tile, index) => {
			const layout = getLayout(tile);
			const drift = gsap.to(tile, {
				y: layout.y + (index % 2 === 0 ? -3 : 3),
				rotation: layout.rotation + (index % 2 === 0 ? 1.5 : -1.5),
				duration: 2.4 + index * 0.35,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut',
			});
			idleTweens.push(drift);
		});
	};

	const resetTile = (tile: HTMLElement, immediate = false) => {
		const inner = getInner(tile);
		if (!inner) return;

		applyFlip(inner, false, reducedMotion);
		applyLayout(tile, getLayout(tile), immediate);
		tile.setAttribute('aria-expanded', 'false');
		tile.classList.remove('is-open');
	};

	const closeOpen = () => {
		if (!openTile) return;
		resetTile(openTile);
		openTile = null;
		startIdle();
	};

	const openTileAt = (tile: HTMLElement) => {
		if (openTile === tile) {
			closeOpen();
			return;
		}

		if (openTile) {
			resetTile(openTile, true);
		}

		openTile = tile;
		stopIdle();

		tiles.forEach((other) => {
			const inner = getInner(other);
			if (!inner) return;

			if (other === tile) {
				applyLayout(other, OPEN_LAYOUT);
				applyFlip(inner, true, reducedMotion);
				other.setAttribute('aria-expanded', 'true');
				other.classList.add('is-open');
				return;
			}

			const layout = getLayout(other);
			applyLayout(other, {
				...layout,
				x: layout.x + (getStackIndex(other) < getStackIndex(tile) ? -24 : 24),
				scale: layout.scale * 0.9,
				zIndex: 1,
			});
			applyFlip(inner, false, reducedMotion);
			other.setAttribute('aria-expanded', 'false');
			other.classList.remove('is-open');
		});
	};

	const runEnter = () => {
		tiles.forEach((tile) => {
			const layout = getLayout(tile);
			const stackIndex = getStackIndex(tile);

			gsap.set(tile, {
				xPercent: -50,
				yPercent: -50,
				transformOrigin: '50% 50%',
				opacity: reducedMotion ? 1 : 0,
				x: layout.x,
				y: reducedMotion ? layout.y : layout.y + 40,
				rotation: reducedMotion
					? layout.rotation
					: layout.rotation + (stackIndex < 2 ? -8 : 8),
				scale: reducedMotion ? layout.scale : layout.scale * 0.85,
				zIndex: layout.zIndex,
			});

			const inner = getInner(tile);
			if (inner) {
				gsap.set(inner, { rotationY: 0 });
			}
		});

		if (reducedMotion) {
			return;
		}

		gsap.to(tiles, {
			opacity: 1,
			y: (index) => STACK_LAYOUTS[index]?.y ?? 0,
			x: (index) => STACK_LAYOUTS[index]?.x ?? 0,
			rotation: (index) => STACK_LAYOUTS[index]?.rotation ?? 0,
			scale: (index) => STACK_LAYOUTS[index]?.scale ?? 1,
			duration: 0.75,
			stagger: 0.1,
			ease: 'power3.out',
			onComplete: startIdle,
		});
	};

	tiles.forEach((tile) => {
		tile.addEventListener('click', (event) => {
			const target = event.target as HTMLElement;
			if (target.closest('.experience-tile-link')) {
				event.stopPropagation();
				return;
			}

			event.preventDefault();
			openTileAt(tile);
		});

		tile.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			if ((event.target as HTMLElement).closest('.experience-tile-link')) return;
			event.preventDefault();
			openTileAt(tile);
		});

		tile.addEventListener('mouseenter', () => {
			if (!hoverEnabled || openTile) return;

			stopIdle();

			tiles.forEach((other) => {
				const layout = getLayout(other);
				if (other === tile) {
					gsap.to(other, {
						y: layout.y - 12,
						scale: layout.scale * 1.05,
						zIndex: 4,
						duration: 0.22,
						ease: 'power3.out',
						overwrite: 'auto',
					});
					return;
				}

				const direction = getStackIndex(other) < getStackIndex(tile) ? -1 : 1;
				gsap.to(other, {
					x: layout.x + direction * 16,
					y: layout.y,
					scale: layout.scale * 0.95,
					zIndex: layout.zIndex,
					duration: 0.22,
					ease: 'power3.out',
					overwrite: 'auto',
				});
			});
		});

		tile.addEventListener('mouseleave', () => {
			if (!hoverEnabled || openTile) return;

			tiles.forEach((other) => applyLayout(other, getLayout(other)));
			startIdle();
		});
	});

	stack.addEventListener('click', (event) => {
		const target = event.target as HTMLElement;
		if (!openTile) return;
		if (target.closest('[data-experience-tile]')) return;
		closeOpen();
	});

	const onEscape = (event: KeyboardEvent) => {
		if (event.key === 'Escape') closeOpen();
	};

	document.addEventListener('keydown', onEscape);

	let enterTrigger: ScrollTrigger | undefined;

	const motionMm = gsap.matchMedia();

	motionMm.add(
		{
			reduce: '(prefers-reduced-motion: reduce)',
			fine: '(hover: hover) and (pointer: fine)',
		},
		(context) => {
			const { reduce, fine } = context.conditions as {
				reduce: boolean;
				fine: boolean;
			};

			reducedMotion = reduce;
			hoverEnabled = fine && !reduce;

			if (reduce) {
				runEnter();
				return;
			}

			enterTrigger = ScrollTrigger.create({
				trigger: root,
				start: 'top 85%',
				once: true,
				onEnter: runEnter,
			});
		},
	);

	return () => {
		stopIdle();
		closeOpen();
		enterTrigger?.kill();
		motionMm.revert();
		document.removeEventListener('keydown', onEscape);
		gsap.set(tiles, { clearProps: 'all' });
		tiles.forEach((tile) => {
			const inner = getInner(tile);
			if (inner) gsap.set(inner, { clearProps: 'all' });
		});
	};
}

export function initExperienceCards() {
	const root = document.getElementById('experience-card');
	if (!root) return;

	const mm = gsap.matchMedia();

	mm.add('(max-width: 1023px)', () => initMobileList(root));

	mm.add('(min-width: 1024px)', () => initDesktopStack(root));
}
