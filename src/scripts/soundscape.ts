import * as Tone from 'tone';
import Debug from '../components/ThreeJS/shared/runtime/Debug';

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
const DEFAULT_LIMITS: Record<string, number> = { ambiance: 4, music: 1, effect: 3 };
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
  pills: Map<string, HTMLButtonElement>;
}

interface ActiveLayer {
  player: Tone.Player;
  gain: Tone.Gain;
  loopDelay: number;
  loopTimer?: number;
}

function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, className?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  return element;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function readMasterVolume(): number {
  const stored = Number(localStorage.getItem(MASTER_VOLUME_KEY));
  return Number.isFinite(stored) ? clamp(stored) : 0.7;
}

function applyCategoryColors(root: HTMLElement, pills: Map<string, HTMLButtonElement>, categoryColors: Record<string, string>): void {
  for (const pill of pills.values()) {
    const category = pill.dataset.category ?? '';
    const color = categoryColors[category] ?? 'var(--sound-accent)';
    pill.style.setProperty('--sound-category-border', color);
  }
  root.style.setProperty('--sound-category-border', 'var(--sound-accent)');
}

function addCategoryColorControls(debugFolder: Debug['ui'], categoryColors: Record<string, string>, apply: () => void): void {
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

  mute(id: string): void {
    const layer = this.layers.get(id);
    if (!layer) return;
    this.disposeLayer(id, layer);
  }

  async applyMix(
    sounds: readonly SoundDefinition[],
    selectedIds: readonly string[],
    levels: Record<string, number>,
    mutedIds: ReadonlySet<string>,
  ): Promise<void> {
    const activeSounds = sounds.filter((sound) => (
      selectedIds.includes(sound.id)
      && !mutedIds.has(sound.id)
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
        if (mutedIds.has(sound.id)) {
          player.dispose();
          gain.dispose();
          return;
        }
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
  mutedIds: ReadonlySet<string>,
  levels: Record<string, number>,
): void {
  const muted = mutedIds.has(sound.id);
  const selected = selectedIds.has(sound.id) && !muted;
  const percentage = Math.round(clamp(levels[sound.id] ?? 0) * 100);
  const baseText = pill.dataset.baseText ?? `${sound.emoji} ${sound.title}`;
  const baseAriaLabel = pill.dataset.baseAriaLabel ?? `${sound.title}, ${sound.category}`;
  pill.classList.toggle('is-selected', selected);
  pill.classList.toggle('is-muted', muted);
  pill.setAttribute('aria-pressed', String(muted));
  pill.dataset.muted = String(muted);
  pill.textContent = muted ? `${baseText} · muted` : selected ? `${baseText} · ${percentage}%` : baseText;
  pill.setAttribute('aria-label', muted ? `${baseAriaLabel}, muted. Activate to unmute.` : `${baseAriaLabel}. Activate to mute.`);
}

function renderInterface(surface: HTMLElement, config: SoundscapeConfigResponse, debugActive: boolean): RenderedInterface {
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
  list.setAttribute('aria-label', 'Available sounds');
  const pills = new Map<string, HTMLButtonElement>();

  for (const sound of config.sounds) {
    const item = createElement('li', 'soundscape__sound-item');
    const pill = createElement('button', 'soundscape__sound');
    pill.type = 'button';
    pill.dataset.soundId = sound.id;
    pill.dataset.category = sound.category;
    pill.dataset.baseText = `${sound.emoji} ${sound.title}`;
    pill.dataset.baseAriaLabel = `${sound.title}, ${sound.category}`;
    if (debugActive) {
      const debugTooltip = getSoundDebugTooltip(sound);
      pill.dataset.debugTooltip = debugTooltip;
      pill.title = debugTooltip;
    }
    pill.setAttribute('aria-pressed', 'false');
    pill.textContent = pill.dataset.baseText;
    item.append(pill);
    pills.set(sound.id, pill);
    list.append(item);
  }

  form.append(input);
  surface.append(form, status, list);
  return { input, status, pills };
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
  const mutedSoundIds = new Set<string>();
  const limits = { ...DEFAULT_LIMITS };
  const visualConfig: SoundscapeVisualConfig = { categoryColors: { ...DEFAULT_CATEGORY_COLORS } };
  const debug = new Debug();
  root.classList.toggle('soundscape--debug', debug.active);
  const limitsFolder = debug.ui?.addFolder('Soundscape limits');
  for (const category of Object.keys(limits)) limitsFolder?.add(limits, category, 0, 20, 1);
  const colorsFolder = debug.ui?.addFolder('Soundscape chip colors');
  let categoryControlsAdded = false;

  const load = async (): Promise<void> => {
    try {
      const config = await getConfig();
      const selectedIds = new Set<string>();
      let soundLevels: Record<string, number> = {};
      for (const sound of config.sounds) {
        if (!(sound.category in visualConfig.categoryColors)) visualConfig.categoryColors[sound.category] = DEFAULT_CATEGORY_COLORS.effect;
      }
      const ui = renderInterface(surface, config, debug.active);
      const applyColors = () => applyCategoryColors(root, ui.pills, visualConfig.categoryColors);
      applyColors();
      if (!categoryControlsAdded) {
        addCategoryColorControls(colorsFolder, visualConfig.categoryColors, applyColors);
        categoryControlsAdded = true;
      }

      for (const sound of config.sounds) {
        const pill = ui.pills.get(sound.id);
        if (!pill) continue;
        pill.addEventListener('click', () => {
          if (mutedSoundIds.has(sound.id)) {
            mutedSoundIds.delete(sound.id);
            if (selectedIds.has(sound.id)) {
              void audio.applyMix(config.sounds, [...selectedIds], soundLevels, mutedSoundIds)
                .catch((error) => console.warn('Muted sound could not resume.', error));
            }
          } else {
            mutedSoundIds.add(sound.id);
            audio.mute(sound.id);
          }
          updatePill(pill, sound, selectedIds, mutedSoundIds, soundLevels);
        });
        updatePill(pill, sound, selectedIds, mutedSoundIds, soundLevels);
      }

      ui.input.focus();
      ui.input.form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const sceneDescription = ui.input.value.trim();
        if (!sceneDescription || ui.input.disabled) return;
        ui.input.disabled = true;
        ui.input.setAttribute('aria-busy', 'true');
        ui.status.textContent = 'Resolving scene…';

        // Unlock audio while the submit event still has a user gesture.
        void audio.resume().catch((error) => console.warn('Audio playback could not start.', error));

        try {
          const result = await resolveScene(sceneDescription, limits);
          selectedIds.clear();
          result.selectedSoundIds.forEach((id) => selectedIds.add(id));
          soundLevels = result.soundLevels;
          for (const sound of config.sounds) {
            const pill = ui.pills.get(sound.id);
            if (pill) updatePill(pill, sound, selectedIds, mutedSoundIds, soundLevels);
          }
          await audio.applyMix(config.sounds, result.selectedSoundIds, result.soundLevels, mutedSoundIds);
          ui.status.textContent = result.selectedSoundIds.length
            ? `${result.selectedSoundIds.filter((id) => !mutedSoundIds.has(id)).length} sound${result.selectedSoundIds.length === 1 ? '' : 's'} playing.`
            : 'No sounds matched this scene.';
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
}

void startSoundscape();
