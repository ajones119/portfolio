import {
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import type { Debug } from '../../shared/runtime';

export type TimeOfDay = 'day' | 'evening' | 'night';

interface TimePreset {
  background: string;
  fogNear: number;
  fogFar: number;
  ground: string;
  keyColor: string;
  keyIntensity: number;
  keyPosition: [number, number, number];
  skyColor: string;
  groundLightColor: string;
  skyIntensity: number;
  sunPosition: [number, number, number];
  moonPosition: [number, number, number];
  sunOpacity: number;
  moonOpacity: number;
}

interface EnvironmentState {
  background: Color;
  fogNear: number;
  fogFar: number;
  ground: Color;
  keyColor: Color;
  keyIntensity: number;
  keyPosition: Vector3;
  skyColor: Color;
  groundLightColor: Color;
  skyIntensity: number;
  sunPosition: Vector3;
  moonPosition: Vector3;
  sunOpacity: number;
  moonOpacity: number;
}

interface Transition {
  elapsed: number;
  from: EnvironmentState;
  to: EnvironmentState;
}

interface CelestialBody {
  group: Group;
  bodyMaterial: MeshBasicMaterial;
  haloMaterial: SpriteMaterial;
}

const TRANSITION_DURATION = 1.2;

const TIME_PRESETS: Record<TimeOfDay, TimePreset> = {
  day: {
    background: '#92b5b3',
    fogNear: 24,
    fogFar: 90,
    ground: '#486b45',
    keyColor: '#fff0cf',
    keyIntensity: 4.6,
    keyPosition: [-20, 46, 12],
    skyColor: '#d8eaeb',
    groundLightColor: '#42583b',
    skyIntensity: 1.65,
    sunPosition: [-34, 38, -46],
    moonPosition: [36, 34, -46],
    sunOpacity: 1,
    moonOpacity: 0,
  },
  evening: {
    background: '#758a80',
    fogNear: 18,
    fogFar: 78,
    ground: '#36543b',
    keyColor: '#ffd79a',
    keyIntensity: 4.2,
    keyPosition: [-28, 34, 18],
    skyColor: '#bcd3d0',
    groundLightColor: '#273722',
    skyIntensity: 1.35,
    sunPosition: [-34, 30, -46],
    moonPosition: [36, 34, -46],
    sunOpacity: 1,
    moonOpacity: 0,
  },
  night: {
    background: '#1b3046',
    fogNear: 14,
    fogFar: 65,
    ground: '#223c34',
    keyColor: '#9dbdff',
    keyIntensity: 2.4,
    keyPosition: [25, 32, -22],
    skyColor: '#819bd0',
    groundLightColor: '#1b2932',
    skyIntensity: 1.25,
    sunPosition: [-34, 26, -46],
    moonPosition: [36, 34, -46],
    sunOpacity: 0,
    moonOpacity: 1,
  },
};

export default class Environment {
  private readonly ground: Mesh<PlaneGeometry, MeshStandardMaterial>;
  private readonly keyLight: DirectionalLight;
  private readonly skyLight: HemisphereLight;
  private readonly sun: CelestialBody;
  private readonly moon: CelestialBody;
  private readonly haloTexture: CanvasTexture;
  private readonly timeButtons: HTMLButtonElement[];
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly debugState: { timeOfDay: TimeOfDay } = { timeOfDay: 'evening' };
  private transition: Transition | null = null;

  constructor(private readonly scene: Scene, debug: Debug) {
    scene.background = new Color();
    scene.fog = new Fog(0x000000, 18, 78);

    this.ground = new Mesh(
      new PlaneGeometry(110, 110),
      new MeshStandardMaterial({ roughness: 1 }),
    );
    this.ground.rotation.x = -Math.PI * .5;
    this.ground.receiveShadow = true;
    scene.add(this.ground);

    this.skyLight = new HemisphereLight();
    scene.add(this.skyLight);

    this.keyLight = new DirectionalLight();
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = -48;
    this.keyLight.shadow.camera.right = 48;
    this.keyLight.shadow.camera.top = 48;
    this.keyLight.shadow.camera.bottom = -48;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 100;
    this.keyLight.shadow.bias = -.00025;
    scene.add(this.keyLight, this.keyLight.target);

    this.haloTexture = createHaloTexture();
    this.sun = this.createCelestialBody('#fff1b0', '#ffd47a', 3.2, 13);
    this.moon = this.createCelestialBody('#dbe6ff', '#a9c5ff', 2.4, 10);
    scene.add(this.sun.group, this.moon.group);

    this.timeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-time]'));
    this.timeButtons.forEach((button) => button.addEventListener('click', this.onTimeClick));

    this.applyState(stateFromPreset(TIME_PRESETS.evening));
    this.setActiveButton('evening');
    this.setupDebug(debug);
  }

  setTimeOfDay = (timeOfDay: TimeOfDay): void => {
    this.debugState.timeOfDay = timeOfDay;
    this.setActiveButton(timeOfDay);
    const target = stateFromPreset(TIME_PRESETS[timeOfDay]);

    if (this.reducedMotion) {
      this.transition = null;
      this.applyState(target);
      return;
    }

    this.transition = {
      elapsed: 0,
      from: this.captureState(),
      to: target,
    };
  };

  update(delta: number): void {
    if (!this.transition) return;

    this.transition.elapsed += delta;
    const progress = Math.min(this.transition.elapsed / TRANSITION_DURATION, 1);
    this.applyInterpolatedState(
      this.transition.from,
      this.transition.to,
      easeInOutCubic(progress),
    );
    if (progress === 1) this.transition = null;
  }

  destroy(): void {
    this.timeButtons.forEach((button) => button.removeEventListener('click', this.onTimeClick));
    this.scene.remove(this.ground, this.keyLight, this.keyLight.target, this.skyLight);
    this.scene.remove(this.sun.group, this.moon.group);
    this.ground.geometry.dispose();
    this.ground.material.dispose();
    this.disposeCelestialBody(this.sun);
    this.disposeCelestialBody(this.moon);
    this.haloTexture.dispose();
    this.keyLight.dispose();
  }

  private onTimeClick = (event: Event): void => {
    const timeOfDay = (event.currentTarget as HTMLButtonElement).dataset.time as TimeOfDay;
    this.setTimeOfDay(timeOfDay);
  };

  private setActiveButton(timeOfDay: TimeOfDay): void {
    this.timeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.time === timeOfDay));
    });
  }

  private captureState(): EnvironmentState {
    const fog = this.scene.fog as Fog;
    return {
      background: (this.scene.background as Color).clone(),
      fogNear: fog.near,
      fogFar: fog.far,
      ground: this.ground.material.color.clone(),
      keyColor: this.keyLight.color.clone(),
      keyIntensity: this.keyLight.intensity,
      keyPosition: this.keyLight.position.clone(),
      skyColor: this.skyLight.color.clone(),
      groundLightColor: this.skyLight.groundColor.clone(),
      skyIntensity: this.skyLight.intensity,
      sunPosition: this.sun.group.position.clone(),
      moonPosition: this.moon.group.position.clone(),
      sunOpacity: this.sun.bodyMaterial.opacity,
      moonOpacity: this.moon.bodyMaterial.opacity,
    };
  }

  private applyInterpolatedState(from: EnvironmentState, to: EnvironmentState, alpha: number): void {
    this.applyState({
      background: from.background.clone().lerp(to.background, alpha),
      fogNear: lerp(from.fogNear, to.fogNear, alpha),
      fogFar: lerp(from.fogFar, to.fogFar, alpha),
      ground: from.ground.clone().lerp(to.ground, alpha),
      keyColor: from.keyColor.clone().lerp(to.keyColor, alpha),
      keyIntensity: lerp(from.keyIntensity, to.keyIntensity, alpha),
      keyPosition: from.keyPosition.clone().lerp(to.keyPosition, alpha),
      skyColor: from.skyColor.clone().lerp(to.skyColor, alpha),
      groundLightColor: from.groundLightColor.clone().lerp(to.groundLightColor, alpha),
      skyIntensity: lerp(from.skyIntensity, to.skyIntensity, alpha),
      sunPosition: from.sunPosition.clone().lerp(to.sunPosition, alpha),
      moonPosition: from.moonPosition.clone().lerp(to.moonPosition, alpha),
      sunOpacity: lerp(from.sunOpacity, to.sunOpacity, alpha),
      moonOpacity: lerp(from.moonOpacity, to.moonOpacity, alpha),
    });
  }

  private applyState(state: EnvironmentState): void {
    (this.scene.background as Color).copy(state.background);
    const fog = this.scene.fog as Fog;
    fog.color.copy(state.background);
    fog.near = state.fogNear;
    fog.far = state.fogFar;
    this.ground.material.color.copy(state.ground);
    this.keyLight.color.copy(state.keyColor);
    this.keyLight.intensity = state.keyIntensity;
    this.keyLight.position.copy(state.keyPosition);
    this.skyLight.color.copy(state.skyColor);
    this.skyLight.groundColor.copy(state.groundLightColor);
    this.skyLight.intensity = state.skyIntensity;
    this.sun.group.position.copy(state.sunPosition);
    this.moon.group.position.copy(state.moonPosition);
    this.setCelestialOpacity(this.sun, state.sunOpacity);
    this.setCelestialOpacity(this.moon, state.moonOpacity);
  }

  private createCelestialBody(
    bodyColor: string,
    haloColor: string,
    radius: number,
    haloSize: number,
  ): CelestialBody {
    const group = new Group();
    const bodyMaterial = new MeshBasicMaterial({
      color: bodyColor,
      fog: false,
      transparent: true,
      depthWrite: false,
    });
    group.add(new Mesh(new SphereGeometry(radius, 16, 12), bodyMaterial));

    const haloMaterial = new SpriteMaterial({
      color: haloColor,
      map: this.haloTexture,
      transparent: true,
      depthWrite: false,
    });
    const halo = new Sprite(haloMaterial);
    halo.scale.setScalar(haloSize);
    group.add(halo);
    return { group, bodyMaterial, haloMaterial };
  }

  private setCelestialOpacity(body: CelestialBody, opacity: number): void {
    body.bodyMaterial.opacity = opacity;
    body.haloMaterial.opacity = opacity * .48;
    body.group.visible = opacity > .001;
  }

  private disposeCelestialBody(body: CelestialBody): void {
    body.group.traverse((child) => {
      if (child instanceof Mesh) child.geometry.dispose();
    });
    body.bodyMaterial.dispose();
    body.haloMaterial.dispose();
  }

  private setupDebug(debug: Debug): void {
    const folder = debug.ui?.addFolder('Light');
    folder?.add(this.debugState, 'timeOfDay', ['day', 'evening', 'night'])
      .name('time of day')
      .onChange(this.setTimeOfDay)
      .listen();
    folder?.add(this.keyLight, 'intensity', 0, 8, .05).name('key intensity').listen();
    folder?.add(this.keyLight.position, 'x', -50, 50, 1).name('key x').listen();
    folder?.add(this.keyLight.position, 'y', 5, 60, 1).name('key y').listen();
    folder?.add(this.keyLight.position, 'z', -50, 50, 1).name('key z').listen();
  }
}

function stateFromPreset(preset: TimePreset): EnvironmentState {
  return {
    background: new Color(preset.background),
    fogNear: preset.fogNear,
    fogFar: preset.fogFar,
    ground: new Color(preset.ground),
    keyColor: new Color(preset.keyColor),
    keyIntensity: preset.keyIntensity,
    keyPosition: new Vector3(...preset.keyPosition),
    skyColor: new Color(preset.skyColor),
    groundLightColor: new Color(preset.groundLightColor),
    skyIntensity: preset.skyIntensity,
    sunPosition: new Vector3(...preset.sunPosition),
    moonPosition: new Vector3(...preset.moonPosition),
    sunOpacity: preset.sunOpacity,
    moonOpacity: preset.moonOpacity,
  };
}

function createHaloTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create the celestial halo texture.');

  const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.28, 'rgba(255,255,255,.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new CanvasTexture(canvas);
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function easeInOutCubic(value: number): number {
  return value < .5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}
