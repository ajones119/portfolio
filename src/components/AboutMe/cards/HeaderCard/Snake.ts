export class SnakeGame {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gridSize: number = 20;
    private tileCountX: number = 0;
    private tileCountY: number = 0;
    private targetTiles = 20; // Target number of tiles (will adjust to fit container)
    
    private snake: Array<{ x: number; y: number }> = [];
    private food: { x: number; y: number } = { x: 0, y: 0 };
    private dx = 0;
    private dy = 0;
    private score = 0;
    private gameRunning = false;
    private gameLoopId: number | null = null;
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get 2d context');
        this.ctx = context;
        
        this.calculateGridSize();
        
        this.setupEventListeners();
        this.draw(); // Draw initial state
    }
    
    private calculateGridSize() {
        // Calculate grid size to fit container perfectly
        // Use the smaller dimension to ensure it fits
        const minDimension = Math.min(this.canvas.width, this.canvas.height);
        
        // Calculate grid size based on target tiles
        this.gridSize = Math.floor(minDimension / this.targetTiles);
        
        // Recalculate tile counts based on actual grid size
        this.tileCountX = Math.floor(this.canvas.width / this.gridSize);
        this.tileCountY = Math.floor(this.canvas.height / this.gridSize);
        
        // Adjust grid size to fit perfectly (no remainder)
        this.gridSize = Math.floor(this.canvas.width / this.tileCountX);
    }
    
    private setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning) return;
            
            // Prevent reverse direction
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                if (this.dy !== 1) {
                    this.dx = 0;
                    this.dy = -1;
                }
            } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                if (this.dy !== -1) {
                    this.dx = 0;
                    this.dy = 1;
                }
            } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                if (this.dx !== 1) {
                    this.dx = -1;
                    this.dy = 0;
                }
            } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                if (this.dx !== -1) {
                    this.dx = 1;
                    this.dy = 0;
                }
            }
        });
    }
    
    start() {
        if (this.gameRunning) return;
        
        // Reset game state
        this.snake = [
            { x: Math.floor(this.tileCountX / 2), y: Math.floor(this.tileCountY / 2) }
        ];
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.gameRunning = true;
        
        this.generateFood();
        this.gameLoop();
    }
    
    stop() {
        this.gameRunning = false;
        if (this.gameLoopId !== null) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
    }
    
    isRunning(): boolean {
        return this.gameRunning;
    }
    
    private generateFood() {
        this.food = {
            x: Math.floor(Math.random() * this.tileCountX),
            y: Math.floor(Math.random() * this.tileCountY)
        };
        
        // Make sure food doesn't spawn on snake
        for (let segment of this.snake) {
            if (segment.x === this.food.x && segment.y === this.food.y) {
                this.generateFood();
                return;
            }
        }
    }
    
    private gameLoop = () => {
        if (!this.gameRunning) return;
        
        this.update();
        this.draw();
        
        // Game speed - ~4 FPS (250ms per frame) - much slower for snake
        setTimeout(() => {
            if (this.gameRunning) {
                this.gameLoopId = requestAnimationFrame(this.gameLoop);
            }
        }, 250);
    }
    
    private update() {
        // If not moving, don't update but still draw
        if (this.dx === 0 && this.dy === 0) {
            return;
        }
        
        // Move snake head
        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
        
        // Check wall collision
        if (head.x < 0 || head.x >= this.tileCountX || head.y < 0 || head.y >= this.tileCountY) {
            this.gameOver();
            return;
        }
        
        // Check self collision
        for (let segment of this.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                this.gameOver();
                return;
            }
        }
        
        this.snake.unshift(head);
        
        // Check food collision
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.generateFood();
        } else {
            this.snake.pop();
        }
    }
    
    private draw() {
        // Clear canvas (transparent background)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Get theme colors from CSS
        const root = document.documentElement;
        const tertiary = getComputedStyle(root).getPropertyValue('--color-tertiary').trim();
        const quaternary = getComputedStyle(root).getPropertyValue('--color-quaternary').trim();
        const primary = getComputedStyle(root).getPropertyValue('--color-primary').trim();
        
        // Draw snake with tertiary color
        this.ctx.fillStyle = tertiary || '#FF9966';
        for (let segment of this.snake) {
            this.ctx.fillRect(
                segment.x * this.gridSize + 1,
                segment.y * this.gridSize + 1,
                this.gridSize - 2,
                this.gridSize - 2
            );
        }
        
        // Draw food with quaternary color
        this.ctx.fillStyle = quaternary || '#99CC99';
        this.ctx.fillRect(
            this.food.x * this.gridSize + 1,
            this.food.y * this.gridSize + 1,
            this.gridSize - 2,
            this.gridSize - 2
        );
        
        // Draw score
        this.ctx.fillStyle = primary || '#000000';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        
        // Draw start message if not running
        if (!this.gameRunning && this.score === 0) {
            this.ctx.fillStyle = primary || '#000000';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Press Start to Play', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.textAlign = 'left';
        }
    }
    
    private gameOver() {
        this.gameRunning = false;
        
        // Get theme colors
        const root = document.documentElement;
        const background = getComputedStyle(root).getPropertyValue('--color-background').trim();
        const primary = getComputedStyle(root).getPropertyValue('--color-primary').trim();
        
        // Draw semi-transparent overlay
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };
        
        const bgRgb = hexToRgb(background || '#FFFFFF');
        this.ctx.fillStyle = bgRgb 
            ? `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, 0.75)`
            : 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = primary || '#000000';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2 - 20);
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.ctx.fillText('Press Start to Play Again', this.canvas.width / 2, this.canvas.height / 2 + 50);
        this.ctx.textAlign = 'left';
        
        // Show start button again
        const startButton = document.querySelector("#snake-start-btn") as HTMLButtonElement;
        if (startButton) {
            startButton.style.display = 'block';
            startButton.textContent = 'Play Again';
        }
    }
    
    resize() {
        this.calculateGridSize();
        this.draw();
    }
}

