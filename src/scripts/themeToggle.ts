// Theme toggle with circular expansion animation
// Similar to juliacodes.com dark mode transition

interface ThemeToggleOptions {
	button: HTMLButtonElement;
	circleOverlay: HTMLElement;
}

export function initThemeToggle({ button, circleOverlay }: ThemeToggleOptions) {
	// Get initial theme from localStorage or system preference
	const getTheme = (): 'light' | 'dark' => {
		const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
		if (stored) return stored;
		
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	};

	// Apply theme to document
	const applyTheme = (theme: 'light' | 'dark') => {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	};

	// Initialize theme
	const currentTheme = getTheme();
	applyTheme(currentTheme);

	// Update button icon based on theme
	const updateButtonIcon = (theme: 'light' | 'dark') => {
		const isDark = theme === 'dark';
		button.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
		button.innerHTML = isDark 
			? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'
			: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
	};

	updateButtonIcon(currentTheme);

	// Get upper right corner coordinates
	const getStartPosition = (): { x: number; y: number } => {
		const { innerWidth, innerHeight } = window;
		return {
			x: innerWidth,
			y: 0
		};
	};

	// Calculate the radius needed to cover the entire viewport
	const getDistanceToFarthestCorner = (x: number, y: number): number => {
		const { innerWidth, innerHeight } = window;
		const corners = [
			{ x: 0, y: 0 },
			{ x: innerWidth, y: 0 },
			{ x: 0, y: innerHeight },
			{ x: innerWidth, y: innerHeight }
		];

		return Math.max(
			...corners.map(corner => {
				const dx = corner.x - x;
				const dy = corner.y - y;
				return Math.sqrt(dx * dx + dy * dy);
			})
		);
	};

	// Calculate scrollbar width
	const getScrollbarWidth = (): number => {
		// Create a temporary div to measure scrollbar width
		const outer = document.createElement('div');
		outer.style.visibility = 'hidden';
		outer.style.overflow = 'scroll';
		outer.style.msOverflowStyle = 'scrollbar';
		document.body.appendChild(outer);
		
		const inner = document.createElement('div');
		outer.appendChild(inner);
		
		const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
		
		outer.parentNode?.removeChild(outer);
		
		return scrollbarWidth;
	};

	// Toggle theme with circular expansion animation
	const toggleTheme = () => {
		//disable the button
		button.disabled = true;
		const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark';
		const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
		const buttonPos = getStartPosition();
		const radius = getDistanceToFarthestCorner(buttonPos.x, buttonPos.y);

		// Scroll to top and lock scrolling
		// Stop Lenis smooth scrolling first
		if (typeof window !== 'undefined' && (window as any).lenis) {
			(window as any).lenis.stop();
		}
		
		// Scroll to top instantly
		window.scrollTo({ top: 0, behavior: 'instant' });
		
		// Calculate scrollbar width before hiding it
		const scrollbarWidth = getScrollbarWidth();
		
		// Lock scrolling and compensate for scrollbar removal
		document.body.style.overflow = 'hidden';
		document.documentElement.style.overflow = 'hidden';
		document.body.style.paddingRight = `${scrollbarWidth}px`;

		// Use white overlay for mix-blend-mode: difference effect
		// This creates the "letters switching mid-letter" visual effect
		circleOverlay.style.backgroundColor = newTheme === 'dark' ? 'white' : 'white';
		
		// Position the circle overlay at the button location
		circleOverlay.style.left = `${buttonPos.x}px`;
		circleOverlay.style.top = `${buttonPos.y}px`;
		circleOverlay.style.width = '0px';
		circleOverlay.style.height = '0px';
		circleOverlay.style.transform = 'translate(-50%, -50%)';
		circleOverlay.style.transition = 'none';
		circleOverlay.style.display = 'block';

		// Check if View Transitions API is supported
		if ('startViewTransition' in document) {
			const transition = (document as any).startViewTransition(() => {
				//applyTheme(newTheme);
				updateButtonIcon(newTheme);
			});

			// Animate the circle expansion after a tiny delay to ensure overlay is positioned
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					circleOverlay.style.width = `${radius * 2}px`;
					circleOverlay.style.height = `${radius * 2}px`;
					circleOverlay.style.transition = 'width 1s cubic-bezier(0.4, 0, 0.2, 1), height 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
				});
			});

			// Hide overlay after animation
			setTimeout(() => {
				applyTheme(newTheme);
				circleOverlay.style.display = 'none';
				circleOverlay.style.transition = 'none';
				
				// Unlock scrolling and remove padding compensation
				document.body.style.overflow = '';
				document.documentElement.style.overflow = '';
				document.body.style.paddingRight = '';
				
				// Resume Lenis if it exists
				if (typeof window !== 'undefined' && (window as any).lenis) {
					(window as any).lenis.start();
				}
				
				button.disabled = false;
			}, 1000);
		} else {
			// Fallback for browsers without View Transitions API
			updateButtonIcon(newTheme);

			// Animate the circle expansion
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					circleOverlay.style.width = `${radius * 2}px`;
					circleOverlay.style.height = `${radius * 2}px`;
					circleOverlay.style.transition = 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1), height 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
				});
			});

			setTimeout(() => {
				applyTheme(newTheme);
				circleOverlay.style.display = 'none';
				circleOverlay.style.transition = 'none';
				
				// Unlock scrolling and remove padding compensation
				document.body.style.overflow = '';
				document.documentElement.style.overflow = '';
				document.body.style.paddingRight = '';
				
				// Resume Lenis if it exists
				if (typeof window !== 'undefined' && (window as any).lenis) {
					(window as any).lenis.start();
				}
				
				button.disabled = false;
			}, 600);
		}

	};

	button.addEventListener('click', toggleTheme);

	// Listen for system theme changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		if (!localStorage.getItem('theme')) {
			applyTheme(e.matches ? 'dark' : 'light');
			updateButtonIcon(e.matches ? 'dark' : 'light');
		}
	});
}

