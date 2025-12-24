/**
 * SNOWFALL SYSTEM
 * 
 * A canvas-based snowfall simulation with physics-based accumulation
 * 
 * ARCHITECTURE OVERVIEW:
 * ======================
 * 1. CONFIGURATION - Adjustable settings at the top
 * 2. CANVAS SETUP - Canvas initialization and sizing
 * 3. DATA STRUCTURES - SnowPile class for grid-based snow storage
 * 4. SNOWFLAKE SYSTEM - Individual flake behavior and rendering
 * 5. COLLISION DETECTION - Surface and pile collision logic
 * 6. ANIMATION LOOP - Main update and render cycle
 * 
 * TEACHING NOTES:
 * - This uses a grid-based approach for efficient collision detection
 * - Each grid cell can be: 0 (empty), 1 (snow), or 2 (blocker/surface)
 * - Snowflakes use wave physics for natural movement
 * - Pile physics handle spreading and decay for realistic accumulation
 */

// ============================================================================
// SECTION 1: CONFIGURATION
// ============================================================================

// Canvas element reference
const canvas = document.getElementById("snow-canvas");

// Core simulation settings
const CONFIG = {
  // Number of snowflakes in the simulation
  numberOfFlakes: 800,
  
  // Size of each grid cell (smaller = more detail, more performance cost)
  cellSize: 1,
  
  // Target frames per second (affects animation smoothness)
  targetFPS: 45,
  
  // Snow accumulation behavior
  collectAtBottom: false,  // If false, snow disappears at bottom edge
  chanceToSpread: 0.004,    // Probability of snow spreading sideways
  chanceToDecay: 0.0002,    // Probability of snow disappearing over time
  
  // Pile system toggle - If false, snow won't accumulate or pile up
  hasPile: true,
  
  // DEBUG MODE - Enable to see grid cells and surface boundaries
  // Change this to true to visualize the grid system
  debug: true
};

// Expose debug toggle to window for easy console access during development
// Usage in console: window.snowfallDebug = true
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'snowfallDebug', {
    get: () => CONFIG.debug,
    set: (value) => {
      CONFIG.debug = Boolean(value);
      console.log(`Snowfall debug mode: ${CONFIG.debug ? 'ENABLED' : 'DISABLED'}`);
    }
  });
}

// ============================================================================
// SECTION 2: CANVAS SETUP
// ============================================================================

if (!canvas) {
  console.error("Snowfall: Canvas element not found!");
}

const ctx = canvas.getContext('2d');

if (!ctx) {
  console.error("Snowfall: Could not get 2D rendering context!");
}

// ============================================================================
// SECTION 3: DATA STRUCTURES - SnowPile Grid System
// ============================================================================

/**
 * SnowPile Class
 * 
 * Manages a grid-based system for storing and rendering accumulated snow.
 * Uses a 2D grid where each cell can be:
 * - 0: Empty space
 * - 1: Snow accumulation
 * - 2: Blocker (surface element that blocks snow)
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Double buffering: Prevents physics race conditions (snow "teleporting")
 * - Cached column counts: O(1) lookup instead of O(rows) per cell
 * - Unsafe accessors: Skip bounds checking in hot paths
 * - Chunk drawing: Batch consecutive cells into single draw calls
 */
class SnowPile {
  cellWidth;
  
  // Double buffer system: read from current, write to next, then swap
  currentBuffer;    // Uint8Array - the buffer we READ from during update
  nextBuffer;       // Uint8Array - the buffer we WRITE to during update
  
  colCount;         // Number of columns in the grid
  rowCount;         // Number of rows in the grid
  
  // Cached column snow counts - updated incrementally for O(1) access
  columnCounts;     // Uint16Array - snow count per column

  constructor(cellSize) {
    this.cellWidth = cellSize;
  }

  // ===========================================================================
  // CORE ACCESSORS
  // ===========================================================================

  /**
   * Calculate flat array index from 2D grid coordinates
   * Grid is stored as a flat array for cache-friendly access
   */
  getIndex(col, row) {
    return row * this.colCount + col;
  }

  /**
   * SAFE: Get value with bounds checking (for external/edge cases)
   * Returns undefined if out of bounds
   */
  getValue(col, row) {
    if (col < 0 || col >= this.colCount || row < 0 || row >= this.rowCount) {
      return undefined;
    }
    return this.currentBuffer[this.getIndex(col, row)];
  }

  /**
   * UNSAFE: Get value without bounds checking (for hot paths)
   * Only use when you've already validated bounds!
   */
  getValueUnsafe(col, row) {
    return this.currentBuffer[row * this.colCount + col];
  }

  /**
   * SAFE: Set value with bounds checking (for external/edge cases)
   * Silently fails if out of bounds
   */
  setValue(col, row, value) {
    if (col < 0 || col >= this.colCount || row < 0 || row >= this.rowCount) {
      return;
    }
    this.currentBuffer[this.getIndex(col, row)] = value;
  }

  /**
   * UNSAFE: Set value without bounds checking (for hot paths)
   * Only use when you've already validated bounds!
   */
  setValueUnsafe(col, row, value) {
    this.currentBuffer[row * this.colCount + col] = value;
  }

  /**
   * Set value in the NEXT buffer (used during double-buffered update)
   */
  setNextValueUnsafe(col, row, value) {
    this.nextBuffer[row * this.colCount + col] = value;
  }

  /**
   * Check if coordinates are within grid bounds
   */
  isInBounds(col, row) {
    return (
      col >= 0 && col < this.colCount &&
      row >= 0 && row < this.rowCount
    );
  }

  // ===========================================================================
  // INITIALIZATION & RESIZE
  // ===========================================================================

  /**
   * Resize the grid when canvas size changes
   * Also rebuilds blocker positions from surface elements
   */
  resize(width, height) {
    // Calculate grid dimensions based on cell size
    this.colCount = Math.ceil(width / this.cellWidth);
    this.rowCount = Math.ceil(height / this.cellWidth);
    
    const totalCells = this.colCount * this.rowCount;
    
    // Create double buffers
    this.currentBuffer = new Uint8Array(totalCells);
    this.nextBuffer = new Uint8Array(totalCells);
    
    // Create column count cache
    this.columnCounts = new Uint16Array(this.colCount);

    // Mark cells that overlap with surface elements as blockers (value 2)
    for (let col = 0; col < this.colCount; col++) {
      for (let row = 0; row < this.rowCount; row++) {
        // Calculate the center point of this grid cell
        const x = col * this.cellWidth + this.cellWidth / 2;
        const y = row * this.cellWidth + this.cellWidth / 2;
        
        // Check if this cell is inside any surface element
        for (const surfacePos of surfacePositions) {
          if (
            x >= surfacePos.left &&
            x <= surfacePos.right &&
            y >= surfacePos.top &&
            y <= surfacePos.bottom
          ) {
            this.setValueUnsafe(col, row, 2); // Mark as blocker
            break;
          }
        }
      }
    }
  }

  /**
   * Convert pixel coordinates to grid coordinates
   * Clamps to valid grid bounds
   */
  getCoords(x, y) {
    const xCol = Math.floor(x / this.cellWidth);
    const yRow = Math.floor(y / this.cellWidth);

    // Clamp to valid grid indices
    const col = Math.max(0, Math.min(xCol, this.colCount - 1));
    const row = Math.max(0, Math.min(yRow, this.rowCount - 1));

    return [col, row];
  }

  // ===========================================================================
  // SNOW MANAGEMENT
  // ===========================================================================

  /**
   * Add a snowflake to the pile at the specified column
   * Finds the topmost empty cell in the column and places snow there
   * Also updates the cached column count
   */
  add(col, baseRow) {
    const rowCount = this.rowCount;

    // If we're not collecting at bottom, don't add at the very bottom row
    if (!CONFIG.collectAtBottom && baseRow === rowCount - 1) {
      return;
    }

    // Start from baseRow and search upward for an empty cell
    let row = Math.min(baseRow, rowCount - 1);

    while (row >= 0) {
      if (this.getValueUnsafe(col, row) === 0) {
        this.setValueUnsafe(col, row, 1);
        this.columnCounts[col]++; // Update cached count
        return;
      }
      row--;
    }
  }

  /**
   * Check if a cell is full (has snow) and the cell above is empty
   * This indicates a surface where snowflakes can land
   */
  isCellFull(col, row) {
    if (!this.isInBounds(col, row)) return false;
    const hasSnow = this.getValueUnsafe(col, row) === 1;
    const aboveEmpty = row === 0 || this.getValueUnsafe(col, row - 1) !== 1;
    return hasSnow && aboveEmpty;
  }

  /**
   * Get cached column snow count - O(1) instead of O(rows)
   */
  getColumnCount(col) {
    return this.columnCounts[col];
  }

  /**
   * Check if an entire row is completely filled with snow
   */
  isRowFull(rowIndex) {
    const colCount = this.colCount;
    for (let i = 0; i < colCount; i++) {
      if (this.getValueUnsafe(i, rowIndex) !== 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Clear all snow from a specific row
   */
  clearRow(rowIndex) {
    for (let col = 0; col < this.colCount; col++) {
      if (this.getValueUnsafe(col, rowIndex) === 1) {
        this.setValueUnsafe(col, rowIndex, 0);
        this.columnCounts[col]--;
      }
    }
  }

  /**
   * Clear all snow from the entire grid (keeps blockers/surfaces)
   */
  clearAllSnow() {
    const colCount = this.colCount;
    const rowCount = this.rowCount;
    
    for (let col = 0; col < colCount; col++) {
      for (let row = 0; row < rowCount; row++) {
        if (this.getValueUnsafe(col, row) === 1) {
          this.setValueUnsafe(col, row, 0);
        }
      }
      this.columnCounts[col] = 0; // Reset column count
    }
  }

  // ===========================================================================
  // PHYSICS UPDATE (Double-Buffered with Gravity Cascade)
  // ===========================================================================

  /**
   * Cascade snow down in a column to fill gaps
   * Called after spreading creates an empty cell
   * 
   * This fixes the "rising bubble" bug where empty cells would
   * slowly rise through the pile one cell per frame.
   * 
   * @param {Uint8Array} buffer - The buffer to modify
   * @param {number} col - Column index
   * @param {number} gapRow - Row where the gap was created
   */
  cascadeColumn(buffer, col, gapRow) {
    const colCount = this.colCount;
    
    // Start from the gap and work upward
    let writeRow = gapRow;
    
    for (let readRow = gapRow - 1; readRow >= 0; readRow--) {
      const readIdx = readRow * colCount + col;
      const cellValue = buffer[readIdx];
      
      // If we find snow, move it down to fill the gap
      if (cellValue === 1) {
        const writeIdx = writeRow * colCount + col;
        buffer[writeIdx] = 1;
        buffer[readIdx] = 0;
        writeRow--; // Next gap position moves up
      }
      // If we hit a blocker, stop cascading
      else if (cellValue === 2) {
        break;
      }
      // Empty cell - gap expands upward, continue searching
    }
  }

  /**
   * Update pile physics using double buffering
   * 
   * DOUBLE BUFFERING EXPLAINED:
   * 1. Copy current state to next buffer
   * 2. Read from current, write changes to next
   * 3. Apply gravity cascade to fill any gaps created by spreading
   * 4. Swap buffers when done
   * 
   * This prevents the "teleporting snow" bug where snow processed
   * early in the loop affects cells processed later in the same frame.
   */
  update() {
    const colCount = this.colCount;
    const rowCount = this.rowCount;
    const current = this.currentBuffer;
    const next = this.nextBuffer;

    // Step 1: Copy current state to next buffer
    next.set(current);

    // Track columns that need gravity cascade after spreading
    const columnsNeedingCascade = [];

    // Step 2: Process physics (read from current, write to next)
    for (let row = rowCount - 2; row >= 0; row--) {
      // Skip completely full rows
      if (this.isRowFull(row)) continue;

      for (let col = 0; col < colCount; col++) {
        const idx = row * colCount + col;
        const cell = current[idx];

        // Only process snow cells
        if (cell !== 1) continue;

        const idxBelow = (row + 1) * colCount + col;
        const cellBelow = current[idxBelow];

        // Case 1: Cell below is empty - snow falls down
        if (cellBelow === 0) {
          next[idxBelow] = 1;
          next[idx] = 0;
        }
        // Case 2: Cell below is blocker - snow rests (do nothing)
        else if (cellBelow === 2) {
          continue;
        }
        // Case 3: Cell below has snow - maybe spread sideways
        else {
          // Use cached column count instead of counting every time!
          const columnSnowCount = this.columnCounts[col];

          const willSpread = Math.random() < CONFIG.chanceToSpread * columnSnowCount;

          if (willSpread && columnSnowCount < rowCount - 3) {
            // Check available directions (read from CURRENT buffer)
            const canMoveLeft = col > 0 && current[idx - 1] === 0;
            const canMoveRight = col < colCount - 1 && current[idx + 1] === 0;

            let dir = 0;
            if (canMoveLeft && canMoveRight) {
              dir = Math.random() < 0.5 ? -1 : 1;
            } else if (canMoveLeft) {
              dir = -1;
            } else if (canMoveRight) {
              dir = 1;
            }

            //if the column is at the max height, force the snow to spread sideways
            if (dir !== 0) {
              next[idx + dir] = 1;
              next[idx] = 0;
              // Update column counts
              this.columnCounts[col]--;
              this.columnCounts[col + dir]++;
              
              // Mark this column for gravity cascade to fill the gap
              columnsNeedingCascade.push({ col, row });
            }
          } else {
            // Small chance of decay
            if (Math.random() < CONFIG.chanceToDecay) {
              next[idx] = 0;
              this.columnCounts[col]--;
              
              // Decay also creates a gap - cascade needed
              columnsNeedingCascade.push({ col, row });
            }
          }
        }
      }
    }

    // Step 3: Apply gravity cascade to fill gaps created by spreading/decay
    // This prevents the "rising bubble" effect
    for (const { col, row } of columnsNeedingCascade) {
      this.cascadeColumn(next, col, row);
    }

    // Clear bottom row if not collecting there
    if (!CONFIG.collectAtBottom) {
      const bottomRowStart = (rowCount - 1) * colCount;
      for (let col = 0; col < colCount; col++) {
        if (next[bottomRowStart + col] === 1) {
          next[bottomRowStart + col] = 0;
          this.columnCounts[col]--;
        }
      }
    }

    // Step 4: Swap buffers
    this.currentBuffer = next;
    this.nextBuffer = current;
  }

  // ===========================================================================
  // RENDERING
  // ===========================================================================

  /**
   * Optimized drawing: Draw a chunk of consecutive cells with the same value
   * Returns the new column index for continued iteration
   */
  drawChunk(rowIndex, colIndex, type, ctx) {
    let newIndex = colIndex;
    const colCount = this.colCount;
    
    // Scan for consecutive cells of same type (using unsafe access)
    while (newIndex < colCount && this.getValueUnsafe(newIndex, rowIndex) === type) {
      newIndex++;
    }

    // Set color based on debug mode
    if (CONFIG.debug) {
      ctx.fillStyle = colIndex % 2 === 0 ? "green" : "red";
    } else {
      ctx.fillStyle = "white";
    }

    // Draw chunk as single rectangle
    ctx.fillRect(
      colIndex * this.cellWidth,
      rowIndex * this.cellWidth,
      (newIndex - colIndex) * this.cellWidth,
        this.cellWidth
    );

    return newIndex;
  }

  /**
   * Draw an entire row as a solid rectangle (optimization for full rows)
   */
  drawRow(rowIndex, ctx) {
    ctx.fillStyle = "white";
    ctx.fillRect(
      0,
      rowIndex * this.cellWidth,
      this.colCount * this.cellWidth,
      this.cellWidth
    );
  }

  /**
   * Main draw method - renders all snow cells to the canvas
   */
  draw(ctx) {
    const rowCount = this.rowCount;
    const colCount = this.colCount;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      // Optimization: Full rows draw as single rectangle
      if (this.isRowFull(rowIndex)) {
        this.drawRow(rowIndex, ctx);
        continue;
      }

      // Draw cells using chunk optimization
      for (let colIndex = 0; colIndex < colCount; colIndex++) {
        const cellValue = this.getValueUnsafe(colIndex, rowIndex);

        if (cellValue === 1) {
          colIndex = this.drawChunk(rowIndex, colIndex, 1, ctx) - 1;
        } else if (CONFIG.debug && cellValue === 2) {
          ctx.fillStyle = "blue";
          colIndex = this.drawChunk(rowIndex, colIndex, 2, ctx) - 1;
        }
      }
    }
  }
}

// ============================================================================
// SECTION 4: SNOWFLAKE SYSTEM
// ============================================================================

/**
 * Snowflake Class
 * 
 * Represents a single falling snowflake with wave-based motion.
 * Each flake has independent physics for natural, varied movement.
 */
class Snowflake {
  x = 0;                    // Current X position
  y = 0;                    // Current Y position
  angle = Math.PI / 2 + Math.PI / 12;  // Fall angle (slight angle for drift)
  velocity = 4;             // Fall speed
  radius = 1;               // Visual size of the flake
  hit = false;              // Whether flake recently hit something
  amplitude = Math.random() * 20 + 10;      // Wave width (horizontal movement range)
  frequency = Math.random() * 0.02 + 0.01;  // Wave frequency (speed of oscillation)
  phase = Math.random() * Math.PI * 2;      // Random phase offset (unique wave pattern)
  baseX = 0;                // Starting X position (for wave calculation)

  constructor(x, y, angle = Math.PI / 2 + Math.PI / 12) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.baseX = x;
  }

  /**
   * Reset flake to top of screen with new random position
   */
  reset() {
    this.y = -10;
    this.x = Math.random() * canvas.width;
    this.baseX = this.x; // Update base position for wave calculation
    this.hit = false;
  }

  /**
   * Update flake position and check for collisions
   */
  update() {
    // Move down based on angle and velocity
    this.y += Math.sin(this.angle) * this.velocity;
    
    // Create wave-like horizontal motion using sine function
    this.x = this.baseX + Math.sin(this.y * this.frequency + this.phase) * this.amplitude;

    // Get grid coordinates for collision detection
    const [col] = pile.getCoords(this.x, this.y);

    // Check for collisions with accumulated snow or surface elements
    if (
      nodeCollideWithSnowPile(this.x, this.y) ||
      nodeCollideWithElement(this.x, this.y)
    ) {
      // Flake hit something - add it to the pile if pile system is enabled
      if (CONFIG.hasPile) {
        const surfaceY = surfaceMap[col]; // Top of surface or canvas bottom
        const baseRow = pile.getCoords(this.x, surfaceY)[1];

        // Add slight randomness to placement (±1 column) for natural spread
        let offset = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        let targetCol = Math.max(0, Math.min(col + offset, pile.colCount - 1));

        pile.add(targetCol, baseRow);
      }
      this.reset();
    } 
    // Flake fell off bottom of screen
    else if (this.y > canvas.height) {
      if (CONFIG.hasPile) {
        const baseRow = pile.getCoords(this.x, canvas.height)[1];
        pile.add(col, baseRow);
      }
      this.reset();
    } else {
      this.hit = false;
    }
  }

  /**
   * Draw the snowflake as a small circle
   */
  draw(ctx) {
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ============================================================================
// SECTION 5: COLLISION DETECTION
// ============================================================================

// Array storing positions of all surface elements (elements with class "surface")
const surfacePositions = [];

// Map of column -> minimum Y position (top of nearest surface or canvas bottom)
const surfaceMap = [];

/**
 * Calculate the surface map - for each column, find the topmost surface
 * This pre-computed map speeds up collision detection
 */
function calculateSurfaceMap() {
  surfaceMap.length = 0;
  const colCount = Math.ceil(canvas.width / pile.cellWidth);

  for (let col = 0; col < colCount; col++) {
    let colX = col * pile.cellWidth + pile.cellWidth / 2;
    let minY = canvas.height; // Default to bottom of canvas

    // Find the topmost surface in this column
    for (const surface of surfacePositions) {
      if (colX >= surface.left && colX <= surface.right) {
        minY = Math.min(minY, surface.top); // Update if we found a higher surface
      }
    }

    surfaceMap[col] = minY;
  }
}

/**
 * Check if a point collides with any surface element
 */
function nodeCollideWithElement(x, y) {
  return surfacePositions.some(pos => {
    return x < pos.right && x > pos.left && y < pos.bottom && y > pos.top;
  });
}

/**
 * Check if a point collides with accumulated snow pile
 * Only returns true if hitting the top surface of the pile
 * Returns false if pile system is disabled
 */
function nodeCollideWithSnowPile(x, y) {
  if (!CONFIG.hasPile) return false;
  const [col, row] = pile.getCoords(x, y);
  return pile.isCellFull(col, row);
}

/**
 * Initialize surface positions by finding all elements with class "surface"
 * Must be called after DOM is ready and whenever layout changes
 */
function initializeCanvas() {
  surfacePositions.length = 0;
  const canvasRect = canvas.getBoundingClientRect();
  const container = canvas.parentElement;

  // Find all elements with class "surface" and store their positions
  container.querySelectorAll(".surface").forEach((element) => {
    const rect = element.getBoundingClientRect();
    surfacePositions.push({
        top: rect.top - canvasRect.top,
        left: rect.left - canvasRect.left,
        right: rect.right - canvasRect.left,
        bottom: rect.bottom - canvasRect.top,
        width: rect.width,
        height: rect.height,
    });
  });

  // Recalculate surface map with new positions
  calculateSurfaceMap();
}

/**
 * Handle canvas resize - update dimensions and regenerate grid
 */
function resizeCanvas() {
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  // Reinitialize surface positions, then resize grid
  initializeCanvas();
  pile.resize(canvas.width, canvas.height);
}

// ============================================================================
// SECTION 6: INITIALIZATION
// ============================================================================

// Create the snow pile grid system
const pile = new SnowPile(CONFIG.cellSize);

// Array to hold all active snowflakes
const flakes = [];

// Initialize canvas size and surfaces
resizeCanvas();

// Listen for window resize to update canvas
window.addEventListener('resize', resizeCanvas);

// Create initial snowflakes
for (let i = 0; i < CONFIG.numberOfFlakes; i++) {
  const randomXPlacement = Math.random() * canvas.width;
  const randomYPlacement = Math.random() * -screen.height - 5;
  flakes.push(new Snowflake(randomXPlacement, randomYPlacement, Math.PI / 2 + Math.PI / 12));
}

// ============================================================================
// SECTION 7: ANIMATION LOOP
// ============================================================================

let lastFrameTime = 0;
const frameDelay = 1000 / CONFIG.targetFPS;

/**
 * Main animation loop using requestAnimationFrame
 * Handles frame rate limiting and coordinates all updates
 */
function animate(time = 0) {
  const delta = time - lastFrameTime;

  // Frame rate limiting - only update if enough time has passed
  if (delta >= frameDelay) {
    lastFrameTime = time;

    // Clear the canvas for this frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw the snow pile (accumulated snow) if enabled
    if (CONFIG.hasPile) {
      pile.update();
      pile.draw(ctx);
    }

    // Update and draw all falling snowflakes
    flakes.forEach(flake => {
      flake.update();
      flake.draw(ctx);
    });
  }

  // Request next animation frame
  requestAnimationFrame(animate);
}

// Start the animation loop
animate();

// Expose clearSnow function globally for button click handlers
if (typeof window !== 'undefined') {
  window.clearSnowfall = function() {
    if (pile) {
      pile.clearAllSnow();
    }
  };
}
