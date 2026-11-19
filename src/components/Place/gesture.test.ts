import { describe, expect, it } from 'vitest';
import { createGesture } from './gesture';

const p = (id: number, x: number, y: number) => ({ id, x, y });

describe('a single pointer', () => {
  it('is a tap when it lifts having moved less than 6 CSS px', () => {
    const gesture = createGesture();
    expect(gesture.down(p(1, 100, 100))).toBeNull();
    expect(gesture.move(p(1, 103, 104))).toBeNull();
    expect(gesture.up(p(1, 104, 103))).toEqual({ type: 'tap', point: { x: 104, y: 103 } });
  });

  it('becomes a drag at 6 CSS px and pans by the whole distance so the Canvas never lags the pointer', () => {
    const gesture = createGesture();
    gesture.down(p(1, 100, 100));
    expect(gesture.move(p(1, 106, 100))).toEqual({ type: 'pan', dx: 6, dy: 0 });
    expect(gesture.move(p(1, 113, 90))).toEqual({ type: 'pan', dx: 7, dy: -10 });
  });

  it('never taps after a drag, even when it comes back to where it started', () => {
    const gesture = createGesture();
    gesture.down(p(1, 100, 100));
    gesture.move(p(1, 140, 100));
    gesture.move(p(1, 100, 100));
    expect(gesture.up(p(1, 100, 100))).toBeNull();
  });

  it('is not a tap when it lifts 6 CSS px away without any move events in between', () => {
    const gesture = createGesture();
    gesture.down(p(1, 100, 100));
    expect(gesture.up(p(1, 106, 100))).toBeNull();
  });

  it('is not a tap when the browser cancels it', () => {
    const gesture = createGesture();
    gesture.down(p(1, 100, 100));
    gesture.cancel(1);
    expect(gesture.up(p(1, 100, 100))).toBeNull();
  });

  it('starts fresh for the next gesture', () => {
    const gesture = createGesture();
    gesture.down(p(1, 0, 0));
    gesture.move(p(1, 50, 0));
    gesture.up(p(1, 50, 0));
    gesture.down(p(2, 10, 10));
    expect(gesture.up(p(2, 10, 10))).toEqual({ type: 'tap', point: { x: 10, y: 10 } });
  });
});

describe('two pointers', () => {
  it('pinch: spreading the fingers apart zooms in about their midpoint', () => {
    const gesture = createGesture();
    gesture.down(p(1, 100, 100));
    expect(gesture.down(p(2, 200, 100))).toBeNull();
    expect(gesture.move(p(2, 300, 100))).toEqual({ type: 'pinch', anchor: { x: 200, y: 100 }, factor: 2, dx: 50, dy: 0 });
  });

  it('pinch: moving both fingers together pans without zooming', () => {
    const gesture = createGesture();
    gesture.down(p(1, 100, 100));
    gesture.down(p(2, 200, 100));
    const first = gesture.move(p(1, 100, 120));
    const second = gesture.move(p(2, 200, 120));
    if (first?.type !== 'pinch' || second?.type !== 'pinch') throw new Error('expected two pinch steps');
    expect(first.factor * second.factor).toBeCloseTo(1);
    expect(first.dx + second.dx).toBeCloseTo(0);
    expect(first.dy + second.dy).toBeCloseTo(20);
    expect(second.anchor).toEqual({ x: 150, y: 120 });
  });

  it('a second finger landing during a possible tap means no tap at all', () => {
    const gesture = createGesture();
    gesture.down(p(1, 100, 100));
    gesture.down(p(2, 200, 100));
    expect(gesture.up(p(2, 200, 100))).toBeNull();
    expect(gesture.up(p(1, 100, 100))).toBeNull();
  });

  it('after a pinch, the finger left on the screen keeps panning from where it is', () => {
    const gesture = createGesture();
    gesture.down(p(1, 100, 100));
    gesture.down(p(2, 200, 100));
    gesture.move(p(2, 250, 100));
    gesture.up(p(2, 250, 100));
    expect(gesture.move(p(1, 102, 101))).toEqual({ type: 'pan', dx: 2, dy: 1 });
    expect(gesture.up(p(1, 102, 101))).toBeNull();
  });

  it('a third finger does not change the pinch', () => {
    const gesture = createGesture();
    gesture.down(p(1, 100, 100));
    gesture.down(p(2, 200, 100));
    gesture.down(p(3, 500, 500));
    expect(gesture.move(p(3, 600, 600))).toBeNull();
  });
});
