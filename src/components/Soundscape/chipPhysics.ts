import { Bodies, Body, Composite, Constraint, Engine, Sleeping } from 'matter-js';
import type { Constraint as MatterConstraint } from 'matter-js';

interface ChipBody {
  body: Body;
  width: number;
  height: number;
}

interface DragState {
  item: HTMLLIElement;
  pointerId: number;
  constraint: MatterConstraint;
  point: { x: number; y: number };
}

export interface ChipDragCallbacks {
  onMove?: (item: HTMLLIElement, point: { x: number; y: number }) => void;
  onEnd?: (item: HTMLLIElement, point: { x: number; y: number } | null) => void;
}

const STEP_MS = 1000 / 60;
const WALL_THICKNESS = 48;

export class ChipPhysics {
  private readonly engine = Engine.create({ enableSleeping: true });
  private readonly bodies = new Map<HTMLLIElement, ChipBody>();
  private readonly boundItems = new WeakSet<HTMLLIElement>();
  private readonly motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly observer: ResizeObserver;
  private walls: Body[] = [];
  private drag: DragState | null = null;
  private frame = 0;
  private lastFrame = 0;
  private accumulatedMs = 0;
  private width = 0;
  private floor = 0;
  private reduced = this.motionQuery.matches;

  constructor(
    private readonly root: HTMLElement,
    private readonly pile: HTMLUListElement,
    private readonly volume: HTMLElement | null,
    private readonly callbacks: ChipDragCallbacks = {},
  ) {
    this.engine.gravity.y = 1.15;
    this.engine.gravity.scale = 0.001;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(root);
    if (volume) this.observer.observe(volume);
    this.motionQuery.addEventListener('change', this.onMotionChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.resize();
    void document.fonts.ready.then(() => this.resize());
  }

  get reducedMotion(): boolean {
    return this.reduced;
  }

  addInitial(items: readonly HTMLLIElement[]): void {
    items.forEach((item, index) => {
      this.bindDrag(item);
      if (this.reduced) {
        this.prepare(item);
        return;
      }
      const width = Math.max(1, this.root.clientWidth);
      const fraction = ((index * 0.61803398875) % 1) * 0.8 + 0.1;
      this.addBody(item, fraction * width, -30 - index * 22, (index % 2 ? -1 : 1) * 0.1);
    });
    if (this.reduced) this.layoutReduced();
  }

  take(item: HTMLLIElement): void {
    if (this.drag?.item === item) this.endDrag();
    const entry = this.bodies.get(item);
    if (!entry) return;
    const opening = entry.body.position;
    Composite.remove(this.engine.world, entry.body);
    this.bodies.delete(item);

    const nearby = [...this.bodies.values()]
      .map(({ body }) => ({ body, dx: opening.x - body.position.x, dy: opening.y - body.position.y }))
      .map((neighbor) => ({ ...neighbor, distance: Math.hypot(neighbor.dx, neighbor.dy) }))
      .filter(({ distance }) => distance > 0 && distance < 190)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    for (const { body, dx, dy, distance } of nearby) {
      const nudge = 0.34 * (1 - distance / 190);
      Body.setVelocity(body, {
        x: body.velocity.x + (dx / distance) * nudge,
        y: body.velocity.y + (dy / distance) * nudge,
      });
      Sleeping.set(body, false);
    }
    this.wake();
  }

  returnFromRow(item: HTMLLIElement, viewportCenter: { x: number; y: number }): void {
    if (this.reduced) {
      this.prepare(item);
      this.layoutReduced();
      return;
    }
    const rootRect = this.root.getBoundingClientRect();
    this.addBody(item, viewportCenter.x - rootRect.left, viewportCenter.y - rootRect.top, 0);
  }

  layoutReduced(): void {
    if (!this.reduced) return;
    const items = Array.from(this.pile.children) as HTMLLIElement[];
    const gap = 8;
    const rows: HTMLLIElement[][] = [[]];
    const rowWidths: number[] = [0];
    const usableWidth = Math.max(1, this.root.clientWidth - 32);
    for (const item of items) {
      this.prepare(item);
      const itemWidth = item.offsetWidth;
      let rowIndex = rows.length - 1;
      if (rows[rowIndex].length && rowWidths[rowIndex] + gap + itemWidth > usableWidth) {
        rows.push([]);
        rowWidths.push(0);
        rowIndex++;
      }
      rows[rowIndex].push(item);
      rowWidths[rowIndex] += (rows[rowIndex].length > 1 ? gap : 0) + itemWidth;
    }
    const rowHeight = Math.max(34, ...items.map((item) => item.offsetHeight)) + gap;
    const firstY = this.floor - rows.length * rowHeight;
    rows.forEach((row, rowIndex) => {
      let x = (this.root.clientWidth - rowWidths[rowIndex]) / 2;
      row.forEach((item) => {
        item.style.transform = `translate3d(${x}px, ${firstY + rowIndex * rowHeight}px, 0)`;
        x += item.offsetWidth + gap;
      });
    });
  }

  destroy(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.endDrag();
    this.observer.disconnect();
    this.motionQuery.removeEventListener('change', this.onMotionChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }

  private prepare(item: HTMLLIElement): void {
    item.classList.add('is-in-pile');
    if (item.parentElement !== this.pile) this.pile.append(item);
  }

  private addBody(item: HTMLLIElement, x: number, y: number, angle: number): void {
    this.prepare(item);
    const width = item.offsetWidth;
    const height = item.offsetHeight;
    const boundedX = Math.max(width / 2 + 12, Math.min(this.root.clientWidth - width / 2 - 12, x));
    const body = Bodies.rectangle(boundedX, y, width, height, {
      chamfer: { radius: Math.min(height / 2, 16) },
      friction: 0.48,
      frictionAir: 0.012,
      restitution: 0.22,
      sleepThreshold: 35,
    });
    Body.setAngle(body, angle);
    Composite.add(this.engine.world, body);
    const entry = { body, width, height };
    this.bodies.set(item, entry);
    this.renderItem(item, entry);
    this.wake();
  }

  private resize(): void {
    const nextWidth = this.root.clientWidth;
    const nextFloor = this.root.clientHeight - (this.volume?.offsetHeight ?? 0) - 80;
    if (!nextWidth || !Number.isFinite(nextFloor)) return;
    const previousWidth = this.width;
    const floorShift = this.floor ? nextFloor - this.floor : 0;
    this.width = nextWidth;
    this.floor = nextFloor;
    Composite.remove(this.engine.world, this.walls);
    this.walls = [
      Bodies.rectangle(nextWidth / 2, nextFloor + WALL_THICKNESS / 2, nextWidth + WALL_THICKNESS * 2, WALL_THICKNESS, { isStatic: true }),
      Bodies.rectangle(-WALL_THICKNESS / 2, this.root.clientHeight / 2, WALL_THICKNESS, this.root.clientHeight + 1000, { isStatic: true }),
      Bodies.rectangle(nextWidth + WALL_THICKNESS / 2, this.root.clientHeight / 2, WALL_THICKNESS, this.root.clientHeight + 1000, { isStatic: true }),
    ];
    Composite.add(this.engine.world, this.walls);
    for (const [item, entry] of this.bodies) {
      const nextItemWidth = item.offsetWidth;
      const nextItemHeight = item.offsetHeight;
      if (nextItemWidth && nextItemHeight && (nextItemWidth !== entry.width || nextItemHeight !== entry.height)) {
        Body.scale(entry.body, nextItemWidth / entry.width, nextItemHeight / entry.height);
        entry.width = nextItemWidth;
        entry.height = nextItemHeight;
      }
      Body.setPosition(entry.body, {
        x: Math.max(entry.width / 2 + 12, Math.min(nextWidth - entry.width / 2 - 12, entry.body.position.x * (previousWidth ? nextWidth / previousWidth : 1))),
        y: entry.body.position.y + floorShift,
      });
      Sleeping.set(entry.body, false);
    }
    if (this.reduced) this.layoutReduced();
    else this.wake();
  }

  private renderItem(item: HTMLLIElement, entry: ChipBody): void {
    const { body, width, height } = entry;
    item.style.transform = `translate3d(${body.position.x - width / 2}px, ${body.position.y - height / 2}px, 0) rotate(${body.angle}rad)`;
  }

  private wake(): void {
    if (this.reduced || this.frame || document.hidden) return;
    this.lastFrame = 0;
    this.accumulatedMs = 0;
    this.frame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (timestamp: number): void => {
    this.frame = 0;
    const delta = this.lastFrame ? Math.min(50, timestamp - this.lastFrame) : STEP_MS;
    this.lastFrame = timestamp;
    this.accumulatedMs += delta;
    let steps = 0;
    while (this.accumulatedMs >= STEP_MS && steps < 3) {
      Engine.update(this.engine, STEP_MS);
      this.accumulatedMs -= STEP_MS;
      steps++;
    }
    for (const [item, entry] of this.bodies) this.renderItem(item, entry);
    if (this.drag || [...this.bodies.values()].some(({ body }) => !body.isSleeping)) {
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  private bindDrag(item: HTMLLIElement): void {
    if (this.boundItems.has(item)) return;
    this.boundItems.add(item);
    item.addEventListener('pointerdown', (event) => {
      const entry = this.bodies.get(item);
      if (this.reduced || !entry || this.drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      item.setPointerCapture(event.pointerId);
      const rect = this.root.getBoundingClientRect();
      const constraint = Constraint.create({
        pointA: { x: event.clientX - rect.left, y: event.clientY - rect.top },
        bodyB: entry.body,
        pointB: { x: 0, y: 0 },
        length: 0,
        stiffness: 0.22,
        damping: 0.1,
      });
      Composite.add(this.engine.world, constraint);
      this.drag = {
        item,
        pointerId: event.pointerId,
        constraint,
        point: { x: event.clientX, y: event.clientY },
      };
      item.classList.add('is-dragging');
      Sleeping.set(entry.body, false);
      this.wake();
    });
    item.addEventListener('pointermove', (event) => {
      if (this.drag?.item !== item || this.drag.pointerId !== event.pointerId) return;
      const rect = this.root.getBoundingClientRect();
      this.drag.constraint.pointA = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      this.drag.point = { x: event.clientX, y: event.clientY };
      this.callbacks.onMove?.(item, this.drag.point);
      this.wake();
    });
    item.addEventListener('pointerup', (event) => {
      if (this.drag?.item === item && this.drag.pointerId === event.pointerId) {
        this.endDrag({ x: event.clientX, y: event.clientY });
      }
    });
    const cancel = (event: PointerEvent): void => {
      if (this.drag?.item === item && this.drag.pointerId === event.pointerId) this.endDrag(null);
    };
    item.addEventListener('pointercancel', cancel);
    item.addEventListener('lostpointercapture', cancel);
  }

  private endDrag(point: { x: number; y: number } | null = null): void {
    if (!this.drag) return;
    const { item, pointerId, constraint } = this.drag;
    this.drag = null;
    Composite.remove(this.engine.world, constraint);
    item.classList.remove('is-dragging');
    if (item.hasPointerCapture(pointerId)) item.releasePointerCapture(pointerId);
    this.callbacks.onEnd?.(item, point);
    this.wake();
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = 0;
    } else {
      this.wake();
    }
  };

  private readonly onMotionChange = (): void => {
    this.reduced = this.motionQuery.matches;
    if (this.reduced) {
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.endDrag();
      for (const entry of this.bodies.values()) Composite.remove(this.engine.world, entry.body);
      this.bodies.clear();
      this.layoutReduced();
    } else {
      for (const item of Array.from(this.pile.children) as HTMLLIElement[]) {
        const rect = item.getBoundingClientRect();
        const rootRect = this.root.getBoundingClientRect();
        this.addBody(item, rect.left + rect.width / 2 - rootRect.left, rect.top + rect.height / 2 - rootRect.top, 0);
      }
    }
  };
}
