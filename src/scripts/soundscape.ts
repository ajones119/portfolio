import * as Tone from 'tone';
import gsap from 'gsap';
import { Flip } from 'gsap/all';
import { ChipPhysics } from '../components/Soundscape/chipPhysics';
import Debug from '../components/ThreeJS/shared/runtime/Debug';

gsap.registerPlugin(Flip);

interface SoundDefinition {
  id: string;
  title: string;
  emoji: string;
  category: string;
  tags: string[];
  description: string;
  file: string;
  playback?: { mode: 'loop'; noiseMultiplier: number; loopDelay: number };
}

interface SoundscapeConfigResponse {
  sounds: SoundDefinition[];
  tags: string[];
}

interface SoundscapeResolveResponse {
  selectedSoundIds: string[];
  soundLevels: Record<string, number>;
  volumeMatches: Array<{
    id: string;
    score: number;
    level: number;
    label: 'silent' | 'subtle' | 'present' | 'strong' | 'foreground';
  }>;
}

const API_BASE_URL = (import.meta.env.PUBLIC_ARAMIS_API_URL ?? 'http://localhost:4322').replace(/\/$/, '');
const DEFAULT_LIMITS: Record<string, number> = { ambiance: 4, music: 1, effect: 4 };
const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  ambiance: '#9be3d2',
  music: '#e9b872',
  effect: '#e58c8c',
};
const MASTER_VOLUME_KEY = 'soundscape-master-volume';
const CROSSFADE_SECONDS = 0.5;

interface SoundscapeVisualConfig {
  categoryColors: Record<string, string>;
}

interface RenderedInterface {
  input: HTMLInputElement;
  status: HTMLElement;
  row: HTMLUListElement;
  pile: HTMLUListElement;
  items: Map<string, HTMLLIElement>;
  pills: Map<string, HTMLButtonElement>;
  pileFaces: Map<string, HTMLSpanElement>;
}

interface ActiveLayer {
  player: Tone.Player;
  gain: Tone.Gain;
  loopDelay: number;
  loopTimer?: number;
}

type Point = { x: number; y: number };
type ApplySelection = (ids: readonly string[], levels: Record<string, number>) => string[];

function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, className?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  return element;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function readMasterVolume(): number {
  const value = localStorage.getItem(MASTER_VOLUME_KEY);
  if (value === null) return 0.7;
  const stored = Number(value);
  return Number.isFinite(stored) ? clamp(stored) : 0.7;
}

function applyCategoryColors(root: HTMLElement, chips: Iterable<HTMLElement>, categoryColors: Record<string, string>): void {
  for (const chip of chips) {
    const category = chip.dataset.category ?? '';
    const color = categoryColors[category] ?? 'var(--sound-accent)';
    chip.style.setProperty('--sound-category-border', color);
  }
  root.style.setProperty('--sound-category-border', 'var(--sound-accent)');
}

function addCategoryColorControls(debugFolder: Debug['ui'] | undefined, categoryColors: Record<string, string>, apply: () => void): void {
  if (!debugFolder) return;
  for (const category of Object.keys(categoryColors)) {
    debugFolder.addColor(categoryColors, category).name(category).onChange(apply);
  }
}

function getSoundDebugTooltip(sound: SoundDefinition): string {
  const playback = sound.playback;
  return [
    `ID: ${sound.id}`,
    `Category: ${sound.category}`,
    `Tags: ${sound.tags.join(', ') || '—'}`,
    `Description: ${sound.description}`,
    `Gain: ${playback?.noiseMultiplier ?? 1}×`,
    `Loop delay: ${playback?.loopDelay ?? 0}s`,
    `URL: ${sound.file || '—'}`,
  ].join('\n');
}

function showMessage(surface: HTMLElement, message: string, retry?: () => void): void {
  surface.replaceChildren();
  const status = createElement('div', 'soundscape__status');
  status.setAttribute('role', retry ? 'alert' : 'status');
  status.textContent = message;
  surface.append(status);
  if (retry) {
    const button = createElement('button', 'soundscape__retry');
    button.type = 'button';
    button.textContent = 'Retry';
    button.addEventListener('click', retry);
    surface.append(button);
  }
}

class SoundscapeAudio {
  private readonly master = new Tone.Gain(readMasterVolume()).toDestination();
  private readonly layers = new Map<string, ActiveLayer>();

  setMasterVolume(value: number): void {
    const next = clamp(value);
    this.master.gain.rampTo(next, 0.05);
    localStorage.setItem(MASTER_VOLUME_KEY, String(next));
  }

  async resume(): Promise<void> {
    await Tone.start();
  }

  private clearLoopTimer(layer: ActiveLayer): void {
    if (layer.loopTimer === undefined) return;
    window.clearTimeout(layer.loopTimer);
    layer.loopTimer = undefined;
  }

  private disposeLayer(id: string, layer: ActiveLayer): void {
    this.clearLoopTimer(layer);
    layer.player.stop();
    layer.player.dispose();
    layer.gain.dispose();
    if (this.layers.get(id) === layer) this.layers.delete(id);
  }

  private scheduleDelayedLoop(id: string, layer: ActiveLayer): void {
    this.clearLoopTimer(layer);
    if (layer.loopDelay <= 0 || !Number.isFinite(layer.player.buffer.duration)) return;

    layer.loopTimer = window.setTimeout(() => {
      layer.loopTimer = undefined;
      if (this.layers.get(id) !== layer) return;
      layer.player.start();
      this.scheduleDelayedLoop(id, layer);
    }, (layer.player.buffer.duration + layer.loopDelay) * 1000);
  }

  async applyMix(
    sounds: readonly SoundDefinition[],
    selectedIds: readonly string[],
    levels: Record<string, number>,
  ): Promise<void> {
    const activeSounds = sounds.filter((sound) => (
      selectedIds.includes(sound.id)
      && Boolean(sound.file)
      && sound.playback?.mode === 'loop'
    ));
    const activeIds = new Set(activeSounds.map((sound) => sound.id));
    const now = Tone.now();

    for (const [id, layer] of this.layers) {
      if (activeIds.has(id)) continue;
      this.clearLoopTimer(layer);
      layer.gain.gain.rampTo(0, CROSSFADE_SECONDS, now);
      window.setTimeout(() => {
        if (this.layers.get(id) !== layer) return;
        this.disposeLayer(id, layer);
      }, CROSSFADE_SECONDS * 1000 + 50);
    }

    const results = await Promise.allSettled(activeSounds.map(async (sound) => {
      let layer = this.layers.get(sound.id);
      const loopDelay = sound.playback?.loopDelay ?? 0;
      if (layer && layer.loopDelay !== loopDelay) {
        this.disposeLayer(sound.id, layer);
        layer = undefined;
      }
      if (!layer) {
        const gain = new Tone.Gain(0).connect(this.master);
        const player = new Tone.Player({ loop: loopDelay <= 0, autostart: false });
        await player.load(sound.file);
        player.connect(gain);
        layer = { player, gain, loopDelay };
        this.layers.set(sound.id, layer);
      }

      const level = clamp(levels[sound.id] ?? 1);
      const noiseMultiplier = sound.playback?.noiseMultiplier ?? 1;
      const effectiveLevel = level * noiseMultiplier;
      if (layer.loopDelay <= 0) {
        if (layer.player.state !== 'started') layer.player.start();
      } else if (layer.loopTimer === undefined && layer.player.state !== 'started') {
        layer.player.start();
        this.scheduleDelayedLoop(sound.id, layer);
      }
      layer.gain.gain.rampTo(effectiveLevel, CROSSFADE_SECONDS, now);
    }));

    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failures.length) console.warn('Some soundscape layers could not be loaded.', failures.map((failure) => failure.reason));
  }
}

function updatePill(
  pill: HTMLButtonElement,
  sound: SoundDefinition,
  selectedIds: ReadonlySet<string>,
  levels: Record<string, number>,
): void {
  const selected = selectedIds.has(sound.id);
  const percentage = Math.round(clamp(levels[sound.id] ?? 0) * 100);
  const baseText = pill.dataset.baseText ?? `${sound.emoji} ${sound.title}`;
  const baseAriaLabel = pill.dataset.baseAriaLabel ?? `${sound.title}, ${sound.category}`;
  pill.classList.toggle('is-selected', selected);
  pill.setAttribute('aria-pressed', String(selected));
  pill.style.setProperty('--sound-level', `${percentage}%`);
  pill.textContent = selected ? `${baseText} · ${percentage}%` : baseText;
  pill.setAttribute('aria-label', selected
    ? `${baseAriaLabel}. Volume ${percentage}%. Drag horizontally to adjust volume, or click to remove.`
    : baseAriaLabel);
}

function renderInterface(root: HTMLElement, surface: HTMLElement, config: SoundscapeConfigResponse, debugActive: boolean): RenderedInterface {
  surface.replaceChildren();
  const form = createElement('form', 'soundscape__form');
  const input = createElement('input', 'soundscape__input');
  input.type = 'text';
  input.name = 'scene';
  input.placeholder = 'Describe a scene…';
  input.autocomplete = 'off';
  input.maxLength = 1000;
  input.setAttribute('aria-label', 'Scene description');
  const status = createElement('div', 'soundscape__status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const list = createElement('ul', 'soundscape__sounds');
  list.setAttribute('aria-label', 'Selected sounds');
  const pile = createElement('ul', 'soundscape__pile');
  pile.setAttribute('aria-label', 'Unselected sounds');
  const items = new Map<string, HTMLLIElement>();
  const pills = new Map<string, HTMLButtonElement>();
  const pileFaces = new Map<string, HTMLSpanElement>();

  for (const sound of config.sounds) {
    const item = createElement('li', 'soundscape__sound-item is-in-pile');
    item.dataset.soundId = sound.id;
    const pileFace = createElement('span', 'soundscape__sound soundscape__sound--pile');
    pileFace.dataset.category = sound.category;
    pileFace.textContent = `${sound.emoji} ${sound.title}`;
    const pill = createElement('button', 'soundscape__sound');
    pill.type = 'button';
    pill.hidden = true;
    pill.dataset.soundId = sound.id;
    pill.dataset.category = sound.category;
    pill.dataset.baseText = `${sound.emoji} ${sound.title}`;
    pill.dataset.baseAriaLabel = `${sound.title}, ${sound.category}`;
    if (debugActive) {
      const debugTooltip = getSoundDebugTooltip(sound);
      pill.dataset.debugTooltip = debugTooltip;
      pill.title = debugTooltip;
      pileFace.dataset.debugTooltip = debugTooltip;
      pileFace.title = debugTooltip;
    }
    pill.setAttribute('aria-pressed', 'false');
    pill.textContent = pill.dataset.baseText;
    item.append(pileFace, pill);
    items.set(sound.id, item);
    pills.set(sound.id, pill);
    pileFaces.set(sound.id, pileFace);
    pile.append(item);
  }

  form.append(input);
  surface.append(form, status, list);
  root.querySelector('.soundscape__pile')?.remove();
  root.append(pile);
  return { input, status, row: list, pile, items, pills, pileFaces };
}

function showSelectedItem(item: HTMLLIElement, selected: boolean): void {
  const face = item.querySelector<HTMLSpanElement>('.soundscape__sound--pile');
  const button = item.querySelector<HTMLButtonElement>('button.soundscape__sound');
  if (!face || !button) return;
  face.hidden = selected;
  button.hidden = !selected;
  item.classList.toggle('is-in-pile', !selected);
  if (selected) item.style.transform = '';
}

async function getConfig(): Promise<SoundscapeConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/api/soundscape/config`);
  if (!response.ok) throw new Error(`Sound catalog request failed (${response.status}).`);
  return response.json() as Promise<SoundscapeConfigResponse>;
}

async function resolveScene(sceneDescription: string, limits: Record<string, number>): Promise<SoundscapeResolveResponse> {
  const response = await fetch(`${API_BASE_URL}/api/soundscape/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sceneDescription, limits }),
  });
  if (!response.ok) throw new Error(`Scene resolution failed (${response.status}).`);
  return response.json() as Promise<SoundscapeResolveResponse>;
}

function wireMasterVolume(audio: SoundscapeAudio): void {
  const input = document.querySelector<HTMLInputElement>('[data-master-volume]');
  const output = document.querySelector<HTMLOutputElement>('[data-master-volume-output]');
  if (!input) return;
  const initial = readMasterVolume();
  input.value = String(Math.round(initial * 100));
  if (output) output.value = `${input.value}%`;
  audio.setMasterVolume(initial);
  input.addEventListener('input', () => {
    const value = clamp(Number(input.value) / 100);
    audio.setMasterVolume(value);
    if (output) output.value = `${Math.round(value * 100)}%`;
  });
}

async function startSoundscape(): Promise<void> {
  const root = document.querySelector<HTMLElement>('[data-soundscape]');
  const surface = root?.querySelector<HTMLElement>('.soundscape__surface');
  if (!root || !surface) return;

  const audio = new SoundscapeAudio();
  wireMasterVolume(audio);
  const limits = { ...DEFAULT_LIMITS };
  const visualConfig: SoundscapeVisualConfig = { categoryColors: { ...DEFAULT_CATEGORY_COLORS } };
  const debug = new Debug();
  root.classList.toggle('soundscape--debug', debug.active);
  const limitsFolder = debug.ui?.addFolder('Soundscape limits');
  for (const category of Object.keys(limits)) limitsFolder?.add(limits, category, 0, 20, 1);
  const colorsFolder = debug.ui?.addFolder('Soundscape chip colors');
  let categoryControlsAdded = false;
  let physics: ChipPhysics | null = null;

  const load = async (): Promise<void> => {
    try {
      const config = await getConfig();
      const selectedIds = new Set<string>();
      let soundLevels: Record<string, number> = {};
      for (const sound of config.sounds) {
        if (!(sound.category in visualConfig.categoryColors)) visualConfig.categoryColors[sound.category] = DEFAULT_CATEGORY_COLORS.effect;
      }
      physics?.destroy();
      const ui = renderInterface(root, surface, config, debug.active);
      let dropPreview: HTMLLIElement | null = null;
      let dropPreviewIndex = -1;
      let applySelection: ApplySelection = () => [];

      const getRowItems = (): HTMLLIElement[] => (
        [...ui.row.children].filter((child) => child !== dropPreview) as HTMLLIElement[]
      );

      const clearDropPreview = (): void => {
        if (!dropPreview) return;
        const items = getRowItems();
        const state = !physics!.reducedMotion && items.length ? Flip.getState(items) : null;
        dropPreview.remove();
        dropPreview = null;
        dropPreviewIndex = -1;
        ui.row.style.minHeight = '';
        if (state) {
          Flip.from(state, {
            targets: items,
            duration: 0.18,
            ease: 'power3.out',
            absolute: false,
            overwrite: true,
          });
        }
      };

      const getDropIndex = (point: Point, items: HTMLLIElement[]): number | null => {
        const rect = ui.row.getBoundingClientRect();
        const padding = 24;
        if (
          point.x < rect.left - padding
          || point.x > rect.right + padding
          || point.y < rect.top - padding
          || point.y > rect.bottom + padding
        ) return null;

        for (let index = 0; index < items.length; index++) {
          const itemRect = items[index].getBoundingClientRect();
          const sameRow = point.y >= itemRect.top - itemRect.height / 2
            && point.y <= itemRect.bottom + itemRect.height / 2;
          if (sameRow && point.x < itemRect.left + itemRect.width / 2) return index;
          if (point.y < itemRect.top && point.x < itemRect.right) return index;
        }
        return items.length;
      };

      const createDropPreview = (sound: SoundDefinition): HTMLLIElement => {
        const item = createElement('li', 'soundscape__sound-item soundscape__drop-preview');
        const face = createElement('span', 'soundscape__sound soundscape__sound--preview');
        face.dataset.category = sound.category;
        face.textContent = `${sound.emoji} ${sound.title} · 70%`;
        face.style.setProperty('--sound-category-border', visualConfig.categoryColors[sound.category] ?? DEFAULT_CATEGORY_COLORS.effect);
        item.append(face);
        return item;
      };

      const updateDropPreview = (item: HTMLLIElement, point: Point): void => {
        const sound = config.sounds.find((candidate) => candidate.id === item.dataset.soundId);
        if (!sound) return;
        const items = getRowItems();
        const index = getDropIndex(point, items);
        if (index === null) {
          clearDropPreview();
          return;
        }
        if (!dropPreview) {
          dropPreview = createDropPreview(sound);
          ui.row.style.minHeight = `${ui.row.getBoundingClientRect().height}px`;
        }
        if (dropPreviewIndex === index) return;
        const state = !physics!.reducedMotion && items.length ? Flip.getState(items) : null;
        dropPreviewIndex = index;
        ui.row.insertBefore(dropPreview, items[index] ?? null);
        if (state) {
          Flip.from(state, {
            targets: items,
            duration: 0.18,
            ease: 'power3.out',
            absolute: false,
            overwrite: true,
          });
        }
      };

      const handleDrop = (item: HTMLLIElement, point: Point | null): void => {
        const preview = dropPreview;
        const index = dropPreviewIndex;
        if (!point || !preview || index < 0) {
          clearDropPreview();
          return;
        }
        const sound = config.sounds.find((candidate) => candidate.id === item.dataset.soundId);
        if (!sound) {
          clearDropPreview();
          return;
        }
        const nextIds = [...selectedIds];
        nextIds.splice(index, 0, sound.id);
        const nextLevels = { ...soundLevels, [sound.id]: 0.7 };
        clearDropPreview();
        const orderedIds = applySelection(nextIds, nextLevels);
        void audio.applyMix(config.sounds, orderedIds, nextLevels)
          .catch((error) => console.warn('Dropped sound could not be added.', error));
      };

      physics = new ChipPhysics(root, ui.pile, root.querySelector('.soundscape__master-volume'), {
        onMove: updateDropPreview,
        onEnd: handleDrop,
      });
      physics.addInitial([...ui.items.values()]);
      if (!physics.reducedMotion) {
        gsap.fromTo(
          [...ui.pileFaces.values()],
          { opacity: 0 },
          { opacity: 0.68, duration: 0.26, ease: 'power3.out', stagger: 0.045, overwrite: true },
        );
      }
      const applyColors = () => applyCategoryColors(root, [...ui.pills.values(), ...ui.pileFaces.values()], visualConfig.categoryColors);
      applyColors();
      if (!categoryControlsAdded) {
        addCategoryColorControls(colorsFolder, visualConfig.categoryColors, applyColors);
        categoryControlsAdded = true;
      }

      applySelection = (ids: readonly string[], levels: Record<string, number>): string[] => {
        const orderedIds = [...new Set(ids)].filter((id) => ui.items.has(id));
        const nextIds = new Set(orderedIds);
        const rowItems = orderedIds.map((id) => ui.items.get(id)!);
        if (!physics!.reducedMotion) Flip.killFlipsOf([...ui.items.values()], false);
        const previous = !physics!.reducedMotion && rowItems.length ? Flip.getState(rowItems) : null;

        for (const id of selectedIds) {
          if (nextIds.has(id)) continue;
          const item = ui.items.get(id);
          if (!item) continue;
          const rect = item.getBoundingClientRect();
          showSelectedItem(item, false);
          physics!.returnFromRow(item, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          if (!physics!.reducedMotion) {
            const face = item.querySelector<HTMLElement>('.soundscape__sound--pile');
            if (face) {
              gsap.fromTo(face, { opacity: 0.12 }, {
                opacity: 0.68,
                duration: 0.28,
                ease: 'power3.out',
                overwrite: 'auto',
              });
            }
          }
        }

        for (const id of orderedIds) {
          const item = ui.items.get(id)!;
          if (!selectedIds.has(id)) physics!.take(item);
          showSelectedItem(item, true);
          ui.row.append(item);
        }

        selectedIds.clear();
        orderedIds.forEach((id) => selectedIds.add(id));
        soundLevels = levels;
        for (const sound of config.sounds) {
          const pill = ui.pills.get(sound.id);
          if (pill) updatePill(pill, sound, selectedIds, soundLevels);
        }

        if (previous) {
          Flip.from(previous, {
            targets: rowItems,
            scale: true,
            duration: 0.34,
            ease: 'back.out(1.18)',
            stagger: 0.025,
          });
        } else if (physics!.reducedMotion) {
          gsap.fromTo(rowItems, { opacity: 0.65 }, { opacity: 1, duration: 0.15, overwrite: true });
        }
        physics!.layoutReduced();
        return orderedIds;
      };

      for (const sound of config.sounds) {
        const pill = ui.pills.get(sound.id);
        if (!pill) continue;
        let dragStartX = 0;
        let dragStartLevel = 0;
        let didDrag = false;

        pill.addEventListener('pointerdown', (event) => {
          if (!selectedIds.has(sound.id) || event.button !== 0) return;
          dragStartX = event.clientX;
          dragStartLevel = clamp(soundLevels[sound.id] ?? 0);
          didDrag = false;
          pill.setPointerCapture(event.pointerId);
        });

        pill.addEventListener('pointermove', (event) => {
          if (!pill.hasPointerCapture(event.pointerId) || !selectedIds.has(sound.id)) return;
          const bounds = pill.getBoundingClientRect();
          if (!bounds.width) return;
          const delta = event.clientX - dragStartX;
          if (!didDrag && Math.abs(delta) < 4) return;
          didDrag = true;
          const nextLevel = clamp(dragStartLevel + delta / bounds.width);
          if (nextLevel === soundLevels[sound.id]) return;
          soundLevels[sound.id] = nextLevel;
          updatePill(pill, sound, selectedIds, soundLevels);
          void audio.applyMix(config.sounds, [...selectedIds], soundLevels)
            .catch((error) => console.warn('Sound volume could not be updated.', error));
        });

        const finishDrag = (event: PointerEvent) => {
          if (pill.hasPointerCapture(event.pointerId)) pill.releasePointerCapture(event.pointerId);
        };
        pill.addEventListener('pointerup', finishDrag);
        pill.addEventListener('pointercancel', finishDrag);

        pill.addEventListener('click', () => {
          if (didDrag) {
            didDrag = false;
            return;
          }
          if (!selectedIds.has(sound.id)) return;
          const nextIds = [...selectedIds].filter((id) => id !== sound.id);
          const orderedIds = applySelection(nextIds, soundLevels);
          void audio.applyMix(config.sounds, orderedIds, soundLevels)
            .catch((error) => console.warn('Sound selection could not be updated.', error));
          if (!ui.input.disabled) {
            ui.status.textContent = '';
          }
        });
        updatePill(pill, sound, selectedIds, soundLevels);
      }

      ui.input.focus();
      ui.input.form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const sceneDescription = ui.input.value.trim();
        if (!sceneDescription || ui.input.disabled) return;
        ui.input.disabled = true;
        ui.input.setAttribute('aria-busy', 'true');
        // Unlock audio while the submit event still has a user gesture.
        void audio.resume().catch((error) => console.warn('Audio playback could not start.', error));

        try {
          const result = await resolveScene(sceneDescription, limits);
          const orderedIds = applySelection(result.selectedSoundIds, result.soundLevels);
          await audio.applyMix(config.sounds, orderedIds, result.soundLevels);
        } catch (error) {
          ui.status.textContent = error instanceof Error ? error.message : 'Scene resolution failed.';
        } finally {
          ui.input.disabled = false;
          ui.input.removeAttribute('aria-busy');
          ui.input.focus();
        }
      });
    } catch (error) {
      showMessage(surface, error instanceof Error ? error.message : 'Could not load sounds.', () => void load());
    }
  };

  await load();
  window.addEventListener('pagehide', () => physics?.destroy(), { once: true });
  document.addEventListener('astro:before-swap', () => physics?.destroy(), { once: true });
}

void startSoundscape();
