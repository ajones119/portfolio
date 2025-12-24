const RAINDROP_COUNT = 50;
const SNOWFLAKE_COUNT = 50;

export const initializeWeatherCanvas = () => {
    const canvas = document.getElementById('weather-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Raindrop class
    class Raindrop {
        x: number;
        y: number;
        speed: number;
        length: number;
        
        constructor(width: number) {
            this.x = Math.random() * width;
            this.y = -50 - Math.random() * 100; // Start above canvas
            this.speed = 2 + Math.random() * 4; // Vary speed
            this.length = 10 + Math.random() * 20; // Vary length
        }
        
        update() {
            this.y += this.speed;
        }
        
        draw(ctx: CanvasRenderingContext2D) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x, this.y + this.length);
            ctx.stroke();
        }
        
        isOffScreen(height: number): boolean {
            return this.y > height + this.length;
        }
    }

    class Snowflake {
        x: number;
        y: number;
        baseX: number;
        baseY: number;
        radius: number;
        opacity: number;
        fallSpeed: number;
        driftAmplitude: number;
        driftSpeed: number;
        driftPhase: number;
        time: number;
        
        constructor(width: number, height: number) {
            this.baseX = Math.random() * width;
            this.baseY = -height - Math.random() * height * 1.25; // Start from above canvas
            this.x = this.baseX;
            this.y = this.baseY;
            
            // Vary size for depth (larger flakes appear closer)
            this.radius = Math.random() * 2.5 + 1.5; // 1.5 to 4 pixels
            
            // Vary opacity for depth (closer flakes are more opaque)
            this.opacity = 0.6 + (this.radius - 1.5) / 2.5 * 0.4; // 0.6 to 1.0
            
            // Fall speed varies with size (larger flakes fall faster)
            this.fallSpeed = 0.3 + (this.radius - 1.5) / 2.5 * 0.7; // 0.3 to 1.0
            
            // Horizontal drift parameters for smooth sine wave
            this.driftAmplitude = Math.random() * 30 + 10; // 10 to 40 pixels
            this.driftSpeed = Math.random() * 0.008 + 0.004; // Slow, smooth oscillation
            this.driftPhase = Math.random() * Math.PI * 2; // Random phase offset
            
            // Time counter for smooth animation
            this.time = Math.random() * 1000; // Random start time
        }
        
        update() {
            // Increment time for smooth animation
            this.time += 1;
            
            // Fall straight down
            this.y += this.fallSpeed;
            
            // Smooth horizontal drift using time-based sine wave
            this.x = this.baseX + Math.sin(this.time * this.driftSpeed + this.driftPhase) * this.driftAmplitude;
        }
        
        draw(ctx: CanvasRenderingContext2D) {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        isOffScreen(height: number): boolean {
            return this.y > height + this.radius * 2;
        }
    }

    // Set canvas size to match the background image container (accounting for device pixel ratio)
    const resizeCanvas = () => {
        // Get the weather-widget-content container to match its size (where the image is)
        const widgetContent = document.getElementById('weather-widget-content');
        if (!widgetContent) return;
        
        const rect = widgetContent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        if (rect.width > 0 && rect.height > 0) {
            // Store logical dimensions (what we'll use for drawing)
            logicalWidth = rect.width;
            logicalHeight = rect.height;
            // Set internal canvas resolution (physical pixels)
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            // Reset transform and scale context to match device pixel ratio
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
            // Canvas CSS size stays at rect dimensions (matches the container)
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
        }
    };
    
    let raindrops: Raindrop[] = [];
    let snowflakes: Snowflake[] = [];
    let animationId: number | null = null;
    let logicalWidth = 0;
    let logicalHeight = 0;
    
    const animate = () => {
        // Resize if needed (in case parent became visible)
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
        }
        
        // Clear canvas using logical dimensions (after scaling) with green background for debugging
        ctx.clearRect(0, 0, logicalWidth, logicalHeight);
        
        const animation = canvas.getAttribute('data-weather-animation');
        
        if (animation === 'rainy') {
            // Add new raindrops
            if (logicalWidth > 0 && logicalHeight > 0 && raindrops.length < RAINDROP_COUNT) {
                for (let i = 0; i < 2; i++) {
                    raindrops.push(new Raindrop(logicalWidth));
                }
            }
            
            // Update and draw raindrops
            raindrops = raindrops.filter(drop => {
                drop.update();
                drop.draw(ctx);
                return !drop.isOffScreen(canvas.height);
            });
        } else {
            // Clear raindrops when not raining
            raindrops = [];
        }

        if (animation === 'snowy') {
            // Add new snowflakes
            if (logicalWidth > 0 && logicalHeight > 0 && snowflakes.length < SNOWFLAKE_COUNT) {
                for (let i = 0; i < 2; i++) {
                    snowflakes.push(new Snowflake(logicalWidth, logicalHeight));
                }
            }
            
            // Update and draw snowflakes
            snowflakes = snowflakes.filter(flake => {
                flake.update();
                flake.draw(ctx);
                return !flake.isOffScreen(logicalHeight);
            });
        } else {
            // Clear raindrops when not raining
            snowflakes = [];
        }
        
        animationId = requestAnimationFrame(animate);
    };
    
    // Watch for attribute changes
    const mutationObserver = new MutationObserver(() => {
        // Animation will respond to attribute changes in the animate loop
    });
    mutationObserver.observe(canvas, { attributes: true, attributeFilter: ['data-weather-animation'] });
    
    // Wait for content to be visible, then initialize
    const widgetContent = document.getElementById('weather-widget-content');
    let resizeObserver: ResizeObserver | null = null;
    
    const init = () => {
        resizeCanvas();
        setTimeout(() => resizeCanvas(), 100); // Double check after a delay
        window.addEventListener('resize', resizeCanvas);
        
        // Watch for layout changes on the widget content container
        if (widgetContent && 'ResizeObserver' in window) {
            resizeObserver = new ResizeObserver(() => {
                resizeCanvas();
            });
            resizeObserver.observe(widgetContent);
        }
        
        requestAnimationFrame(animate);
    };
    
    if (widgetContent) {
        requestAnimationFrame(init);
    }
    
    // Cleanup
    return () => {
        if (animationId) cancelAnimationFrame(animationId);
        mutationObserver.disconnect();
        if (resizeObserver) resizeObserver.disconnect();
        window.removeEventListener('resize', resizeCanvas);
    };
};
