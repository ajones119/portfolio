import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { DEFAULT_SETTINGS, loadSettings, rebind } from './settings.js';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
  clear(): void { this.values.clear(); }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  get length(): number { return this.values.size; }
}

describe('game settings', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
  });

  it('falls back after corrupt JSON and returns an independent default object', () => {
    localStorage.setItem('jelly-dogfight-settings', '{broken');
    const settings = loadSettings();
    assert.deepEqual(settings, DEFAULT_SETTINGS);
    settings.bindings.pitchDown = 'KeyZ';
    assert.equal(DEFAULT_SETTINGS.bindings.pitchDown, 'KeyW');
  });

  it('migrates partial older settings while validating and clamping values', () => {
    localStorage.setItem('jelly-dogfight-settings', JSON.stringify({
      version: 0,
      bindings: { pitchDown: 'KeyZ', pitchUp: 'not-a-binding' },
      mouseSensitivity: 99,
      invertY: true,
      reticle: 'invalid',
      masterVolume: -2,
    }));
    const settings = loadSettings();
    assert.equal(settings.version, 2);
    assert.equal(settings.bindings.pitchDown, 'KeyZ');
    assert.equal(settings.bindings.pitchUp, DEFAULT_SETTINGS.bindings.pitchUp);
    assert.equal(settings.mouseSensitivity, 2);
    assert.equal(settings.invertY, true);
    assert.equal(settings.reticle, DEFAULT_SETTINGS.reticle);
    assert.equal(settings.masterVolume, 0);
    assert.equal(settings.reducedMotion, false);
    assert.equal(settings.cameraShake, DEFAULT_SETTINGS.cameraShake);
  });

  it('reports conflicts and explicitly swaps bindings', () => {
    const settings = loadSettings();
    const blocked = rebind(settings, 'pitchDown', settings.bindings.pitchUp);
    assert.equal(blocked.conflict, 'pitchUp');
    assert.equal(blocked.settings, settings);
    const swapped = rebind(settings, 'pitchDown', settings.bindings.pitchUp, true).settings;
    assert.equal(swapped.bindings.pitchDown, 'KeyS');
    assert.equal(swapped.bindings.pitchUp, 'KeyW');
    assert.deepEqual(loadSettings(), swapped);
  });
});
