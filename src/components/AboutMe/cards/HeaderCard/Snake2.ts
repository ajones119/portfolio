/**
 * SNAKE GAME - LEARNING SKELETON
 * 
 * KEY CONCEPTS:
 * 
 * 1. GAME LOOP
 *    - Continuous cycle: Update game state → Draw to screen → Repeat
 *    - Use requestAnimationFrame for smooth rendering
 *    - Control speed with setTimeout/delay
 * 
 * 2. GRID-BASED MOVEMENT
 *    - Game world is divided into discrete tiles (like a chess board)
 *    - Snake moves one tile at a time, not pixel by pixel
 *    - Makes collision detection and movement predictable
 * 
 * 3. SNAKE DATA STRUCTURE
 *    - Array of {x, y} coordinates representing each segment
 *    - First element = head, last element = tail
 *    - To move: add new head position, remove tail (unless eating food)
 * 
 * 4. COLLISION DETECTION
 *    - Wall collision: check if head position is outside grid bounds
 *    - Self collision: check if head position matches any body segment
 *    - Food collision: check if head position matches food position
 * 
 * 5. GAME STATE
 *    - Track: snake position, food position, direction, score, running status
 *    - Reset all state when starting new game
 * 
 * 6. INPUT HANDLING
 *    - Listen for keyboard events
 *    - Store next direction (don't apply immediately - prevents instant reverse)
 *    - Apply direction on next game tick
 */

export class SnakeGame2 {
    // Canvas and rendering context
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    // Grid configuration
    private gridSize: number = 20; // Size of each tile in pixels
    private tileCountX: number = 0; // Number of tiles horizontally
    private tileCountY: number = 0; // Number of tiles vertically
    
    // Game state
    private snake: Array<{ x: number; y: number }> = []; // Array of snake segments
    private food: { x: number; y: number } = { x: 0, y: 0 }; // Food position
    private dx: number = 0; // Horizontal direction (-1 left, 0 none, 1 right)
    private dy: number = 0; // Vertical direction (-1 up, 0 none, 1 down)
    private score: number = 0;
    private gameRunning: boolean = false;
    private gameLoopId: number | null = null; // Store animation frame ID for cleanup
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get 2d context');
        this.ctx = context;
        
        // TODO: Calculate grid size and tile counts based on canvas dimensions
        // Hint: tileCountX = Math.floor(canvas.width / gridSize)
        
        // TODO: Set up event listeners for keyboard input
        // Hint: Use document.addEventListener('keydown', ...)
        
        // TODO: Draw initial state
    }
    
    /**
     * Set up keyboard event listeners
     * Arrow keys or WASD to control direction
     * Prevent reversing into yourself (can't go right if moving left)
     */
    private setupEventListeners(): void {
        // TODO: Add keydown event listener
        // TODO: Check which key was pressed (ArrowUp, ArrowDown, ArrowLeft, ArrowRight, or w/a/s/d)
        // TODO: Update dx and dy based on key pressed
        // TODO: Prevent reverse direction (if moving right, can't go left)
    }
    
    /**
     * Start a new game
     * Reset all game state to initial values
     */
    start(): void {
        // TODO: Check if game is already running, return early if so
        
        // TODO: Reset snake to starting position (center of grid)
        // Hint: snake = [{ x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) }]
        
        // TODO: Reset direction (dx = 0, dy = 0)
        
        // TODO: Reset score
        
        // TODO: Set gameRunning = true
        
        // TODO: Generate initial food position
        
        // TODO: Start the game loop
    }
    
    /**
     * Stop the game and clean up
     */
    stop(): void {
        // TODO: Set gameRunning = false
        
        // TODO: Cancel animation frame if one is running
        // Hint: if (this.gameLoopId !== null) cancelAnimationFrame(this.gameLoopId)
    }
    
    /**
     * Generate food at a random position
     * Make sure it doesn't spawn on the snake
     */
    private generateFood(): void {
        // TODO: Generate random x and y within grid bounds
        // Hint: Math.floor(Math.random() * tileCountX)
        
        // TODO: Check if food position overlaps with any snake segment
        // TODO: If it does, regenerate (recursive call)
    }
    
    /**
     * Main game loop - runs continuously while game is running
     * Updates game state, then draws to screen
     */
    private gameLoop = (): void => {
        // TODO: Check if game is still running, return if not
        
        // TODO: Update game state (move snake, check collisions)
        // TODO: Draw everything to canvas
        
        // TODO: Schedule next frame with delay for game speed
        // Hint: setTimeout(() => requestAnimationFrame(this.gameLoop), delay)
    }
    
    /**
     * Update game state - move snake, check collisions
     */
    private update(): void {
        // TODO: If not moving (dx === 0 && dy === 0), return early
        
        // TODO: Calculate new head position
        // Hint: const head = { x: snake[0].x + dx, y: snake[0].y + dy }
        
        // TODO: Check wall collision
        // Hint: if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY)
        // TODO: If collision, call gameOver() and return
        
        // TODO: Check self collision
        // Hint: Loop through snake segments, check if head matches any segment
        // TODO: If collision, call gameOver() and return
        
        // TODO: Add new head to front of snake array
        // Hint: snake.unshift(head)
        
        // TODO: Check food collision
        // Hint: if (head.x === food.x && head.y === food.y)
        // TODO: If eating food: increment score, generate new food, DON'T remove tail
        // TODO: If not eating: remove tail (snake.pop())
    }
    
    /**
     * Draw everything to the canvas
     */
    private draw(): void {
        // TODO: Clear the canvas
        // Hint: ctx.fillStyle = '#FF0000'; ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // TODO: Draw checkerboard pattern (optional, for visual aid)
        // Hint: Loop through tiles, alternate colors based on (x + y) % 2
        
        // TODO: Draw grid borders (optional)
        // Hint: Use ctx.strokeStyle and ctx.strokeRect or ctx.beginPath/lineTo
        
        // TODO: Draw snake
        // Hint: Loop through snake array, draw rectangle for each segment
        // Hint: segment.x * gridSize gives pixel position
        
        // TODO: Draw food
        // Hint: Draw rectangle at food.x * gridSize, food.y * gridSize
        
        // TODO: Draw score
        // Hint: ctx.fillText(`Score: ${score}`, x, y)
        
        // TODO: Draw start message if game not running (optional)
    }
    
    /**
     * Handle game over
     * Stop the game, show game over message
     */
    private gameOver(): void {
        // TODO: Set gameRunning = false
        
        // TODO: Draw game over overlay
        // Hint: Semi-transparent black rectangle, then white text
        
        // TODO: Show final score
        
        // TODO: Show restart message
        
        // TODO: Show start button again (if using one)
    }
    
    /**
     * Handle canvas resize
     * Recalculate grid size and tile counts
     */
    resize(): void {
        // TODO: Recalculate tileCountX and tileCountY based on new canvas size
        // TODO: Redraw the game
    }
}
