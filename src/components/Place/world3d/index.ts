import * as THREE from 'three';
import type { Pixel, Size, View } from '../viewport';
import { createPlantField, PLANT_RADIUS } from './chunks';
import { applyLook, createInput, stepPlayer, type Grid, type Player } from './controls';
import { createPlantVisuals } from './geometry';
import { createGround } from './ground';
import { plantForColor } from './plants';
import { DIVE_SECONDS, divePose, EYE_HEIGHT, FADE_SECONDS, topDownPose, type Pose } from './transition';

const FOV = 70;
const SKY_TOP = new THREE.Color(0x6f9fd8);
const HORIZON = new THREE.Color(0xf3c9a0);
const SUN_DIRECTION = new THREE.Vector3(-0.55, 0.32, -0.45).normalize();

export interface WorldOptions {
  /** Where the world mounts: a positioned element covering the viewport. */
  container: HTMLElement;
  pixels: Int32Array;
  width: number;
  height: number;
  /** The Pixel to dive into. */
  focus: Pixel;
  /** The 2D view right now, which the dive starts from. */
  view: View;
  /** The 2D view to return to, centered on the Pixel the player is standing on. */
  viewFor(pixel: Pixel): View;
  /** Esc or the exit button was pressed; the page should call `exit()`. */
  onExitRequest(): void;
}

export interface World {
  /** Resolves once the dive has landed. */
  ready: Promise<void>;
  applyPlaced(x: number, y: number, color: number): void;
  /** A fresh snapshot after a reconnect: only the Pixels that changed animate. */
  applySnapshot(pixels: Int32Array): void;
  /** Flies back up to the 2D view and tears everything down. Resolves with the Pixel the player stood on. */
  exit(): Promise<Pixel>;
}

function createSky(): { mesh: THREE.Mesh; dispose(): void } {
  const geometry = new THREE.SphereGeometry(900, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: SKY_TOP },
      uHorizon: { value: HORIZON },
      uSun: { value: SUN_DIRECTION },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uSun;
      varying vec3 vDirection;
      void main() {
        vec3 d = normalize(vDirection);
        vec3 color = mix(uHorizon, uTop, pow(clamp(d.y, 0.0, 1.0), 0.55));
        float sun = max(dot(d, uSun), 0.0);
        color += vec3(1.0, 0.82, 0.55) * (pow(sun, 900.0) * 1.6 + pow(sun, 12.0) * 0.25);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, dispose: () => { geometry.dispose(); material.dispose(); } };
}

function createHud(container: HTMLElement, onExit: () => void) {
  const hud = document.createElement('div');
  hud.className = 'place-world__hud';
  hud.innerHTML = `
    <button type="button" class="place-world__exit" aria-label="Leave the 3D garden">✕ Exit</button>
    <div class="place-world__compass" aria-hidden="true"><span class="place-world__compass-dial"><b>N</b></span></div>
    <p class="place-world__coords" role="status" aria-live="off"></p>
    <p class="place-world__hint"></p>`;
  const exit = hud.querySelector<HTMLButtonElement>('.place-world__exit')!;
  // Keep clicks on the HUD from also grabbing pointer lock.
  for (const type of ['click', 'pointerdown'] as const) hud.addEventListener(type, (event) => event.stopPropagation());
  exit.addEventListener('click', onExit);
  const dial = hud.querySelector<HTMLElement>('.place-world__compass-dial')!;
  const coords = hud.querySelector<HTMLElement>('.place-world__coords')!;
  const hint = hud.querySelector<HTMLElement>('.place-world__hint')!;
  const coarse = matchMedia('(pointer: coarse)').matches;
  container.append(hud);
  let lastText = '';
  let lastHint = '';
  return {
    update(player: Player, locked: boolean) {
      dial.style.transform = `rotate(${player.yaw}rad)`;
      const text = `${Math.floor(player.x)}, ${Math.floor(player.z)}`;
      if (text !== lastText) coords.textContent = lastText = text;
      const nextHint = coarse
        ? 'Left thumb to walk · drag to look'
        : locked ? 'WASD to walk · Shift to sprint · Esc to release mouse'
        : 'Click to look around · WASD to walk · Esc to leave';
      if (nextHint !== lastHint) hint.textContent = lastHint = nextHint;
    },
    show(visible: boolean) { hud.dataset.visible = String(visible); },
    remove() { hud.remove(); },
  };
}

/**
 * Turns the Canvas into a walkable first-person garden. Each Pixel's color
 * decides what grows on its tile (see plants.ts). It dives in from the 2D view
 * on entry and flies back out on exit.
 */
export function enterWorld(options: WorldOptions): World {
  const { container, width, height, focus } = options;
  const pixels = Int32Array.from(options.pixels);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const shadows = !coarse;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'place-world__canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '3D garden grown from the Canvas');
  canvas.style.opacity = '0';
  container.append(canvas);

  const viewportSize = (): Size => ({ width: container.clientWidth, height: container.clientHeight });
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 2000);
  camera.rotation.order = 'YXZ';
  const resize = () => {
    const { width: w, height: h } = viewportSize();
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const scene = new THREE.Scene();
  // Fog is by distance (see ground.ts and geometry.ts), ending before plants run out ahead of the player.
  const FOG_NEAR = 20;
  const FOG_FAR = PLANT_RADIUS - 8;
  const fog = new THREE.Fog(HORIZON, FOG_NEAR, FOG_FAR);
  scene.fog = fog;
  scene.background = HORIZON;
  const sky = createSky();
  scene.add(sky.mesh);
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x9a7a5e, 2.0));
  const sun = new THREE.DirectionalLight(0xffe0b8, 2.2);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = -28; s.right = 28; s.top = 28; s.bottom = -28; s.near = 1; s.far = 120;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.04;
  }
  scene.add(sun, sun.target);

  const ground = createGround(pixels, width, height);
  scene.add(ground.group);
  const visuals = createPlantVisuals();
  const field = createPlantField(pixels, width, height, visuals, { shadows });
  scene.add(field.group);

  const inBounds = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < width && ty < height;
  const grid: Grid = {
    width,
    height,
    blocks: (tx, ty) => inBounds(tx, ty) && plantForColor(pixels[ty * width + tx]).blocks,
    slows: (tx, ty) => inBounds(tx, ty) && plantForColor(pixels[ty * width + tx]).slows,
  };

  let player: Player = { x: focus.x + 0.5, z: focus.y + 0.5, yaw: 0, pitch: 0 };
  const standing = (): Pose => ({ x: player.x, y: EYE_HEIGHT, z: player.z, yaw: player.yaw, pitch: player.pitch });

  type Phase =
    | { kind: 'dive'; from: Pose; to: Pose; start: number; done: () => void }
    | { kind: 'walk' }
    | { kind: 'rise'; from: Pose; to: Pose; start: number; done: () => void };
  let phase: Phase = { kind: 'walk' };
  let input: ReturnType<typeof createInput> | null = null;

  const hud = createHud(container, () => options.onExitRequest());
  hud.show(false);

  const timer = new THREE.Timer();
  const now = () => timer.getElapsed();
  const setPose = (pose: Pose) => {
    camera.position.set(pose.x, pose.y, pose.z);
    camera.rotation.set(pose.pitch, pose.yaw, 0);
  };

  // The flat look (and no fog) while the camera is high, so the first frame matches the 2D Canvas.
  // Around the Canvas, the 2D page shows its own background; match it while looking down from high up.
  const pageColor = new THREE.Color(getComputedStyle(document.body).backgroundColor || '#ffffff');
  function blendForHeight(y: number): void {
    const flat = THREE.MathUtils.clamp((y - 25) / 60, 0, 1);
    ground.setFlat(flat);
    const high = flat > 0.5;
    sky.mesh.visible = !high;
    scene.background = high ? pageColor : HORIZON;
    fog.near = THREE.MathUtils.lerp(FOG_NEAR, 4000, flat);
    fog.far = THREE.MathUtils.lerp(FOG_FAR, 5000, flat);
  }

  // Snapped to whole shadow-map texels, so shadow edges don't crawl as the player walks.
  const SHADOW_TEXEL = 56 / 2048;
  function followSun(): void {
    const x = Math.round(player.x / SHADOW_TEXEL) * SHADOW_TEXEL;
    const z = Math.round(player.z / SHADOW_TEXEL) * SHADOW_TEXEL;
    sun.position.set(x + SUN_DIRECTION.x * 60, SUN_DIRECTION.y * 60, z + SUN_DIRECTION.z * 60);
    sun.target.position.set(x, 0, z);
  }

  function fade(to: number): Promise<void> {
    canvas.style.transition = `opacity ${FADE_SECONDS}s ease-out`;
    canvas.style.opacity = String(to);
    return new Promise((resolve) => setTimeout(resolve, FADE_SECONDS * 1000));
  }

  function frame(): void {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = now();
    if (phase.kind === 'walk' && input) {
      const look = input.consumeLook();
      player = applyLook(player, look.dYaw, look.dPitch);
      player = stepPlayer(player, input.read(), dt, grid);
      setPose(standing());
      blendForHeight(EYE_HEIGHT);
    } else if (phase.kind !== 'walk') {
      const progress = (t - phase.start) / DIVE_SECONDS;
      const pose = phase.kind === 'dive'
        ? divePose(phase.from, phase.to, progress)
        : divePose(phase.to, phase.from, 1 - progress);
      setPose(pose);
      blendForHeight(pose.y);
      if (phase.kind === 'rise') field.group.scale.y = Math.max(1 - progress * 1.6, 0.001);
      if (progress >= 1) phase.done();
    }
    field.update(player.x, player.z, t);
    visuals.update(t);
    followSun();
    hud.update(player, document.pointerLockElement === container);
    renderer.render(scene, camera);
  }

  function startWalking(): void {
    phase = { kind: 'walk' };
    input = createInput(container);
    hud.show(true);
    canvas.focus({ preventScroll: true });
  }

  const ready = (async () => {
    const landed = new Promise<void>((resolve) => {
      const from = topDownPose(options.view, viewportSize(), FOV);
      setPose(reducedMotion ? standing() : from);
      blendForHeight(reducedMotion ? EYE_HEIGHT : from.y);
      if (reducedMotion) field.growAll();
      // Compile every shader before the clock starts, so the first frames don't stall and skip the swoop.
      void renderer.compileAsync(scene, camera).catch(() => undefined).then(() => {
        renderer.render(scene, camera);
        timer.reset();
        const start = now();
        const land = () => { startWalking(); resolve(); };
        renderer.setAnimationLoop(frame);
        if (reducedMotion) {
          void fade(1).then(land);
          return;
        }
        field.ripple(focus.x, focus.y, start + 0.55, 55);
        phase = { kind: 'dive', from, to: standing(), start, done: land };
        void fade(1);
      });
    });
    await landed;
  })();

  // While the mouse is locked, the browser spends Esc on releasing it; the next Esc leaves.
  // Some browsers still deliver that keydown just after unlocking, so ignore Esc briefly then.
  let unlockedAt = -Infinity;
  const onLockChange = () => { if (!document.pointerLockElement) unlockedAt = performance.now(); };
  document.addEventListener('pointerlockchange', onLockChange);
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && phase.kind === 'walk' && input && !document.pointerLockElement
      && performance.now() - unlockedAt > 150) {
      event.preventDefault();
      event.stopPropagation();
      options.onExitRequest();
    }
  };
  window.addEventListener('keydown', onKey, true);

  let exiting: Promise<Pixel> | null = null;

  return {
    ready,
    applyPlaced(x, y, color) {
      if (!inBounds(x, y)) return;
      pixels[y * width + x] = color;
      ground.setPixel(x, y, color);
      field.setPixel(x, y, color, now());
    },
    applySnapshot(next) {
      if (next.length !== pixels.length) return;
      for (let i = 0; i < next.length; i += 1) {
        if (next[i] === pixels[i]) continue;
        this.applyPlaced(i % width, Math.floor(i / width), next[i]);
      }
    },
    exit() {
      if (exiting) return exiting;
      exiting = (async () => {
        await ready;
        input?.dispose();
        input = null;
        hud.show(false);
        const pixel = {
          x: THREE.MathUtils.clamp(Math.floor(player.x), 0, width - 1),
          y: THREE.MathUtils.clamp(Math.floor(player.z), 0, height - 1),
        };
        if (!reducedMotion) {
          const to = topDownPose(options.viewFor(pixel), viewportSize(), FOV);
          await new Promise<void>((resolve) => {
            phase = { kind: 'rise', from: standing(), to, start: now(), done: resolve };
          });
          phase = { kind: 'walk' };
        }
        await fade(0);
        if (import.meta.env.DEV) console.debug('[place 3D] renderer memory before dispose', { ...renderer.info.memory });
        renderer.setAnimationLoop(null);
        window.removeEventListener('keydown', onKey, true);
        document.removeEventListener('pointerlockchange', onLockChange);
        resizeObserver.disconnect();
        hud.remove();
        field.dispose();
        ground.dispose();
        sky.dispose();
        sun.shadow.map?.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
        return pixel;
      })();
      return exiting;
    },
  };
}
