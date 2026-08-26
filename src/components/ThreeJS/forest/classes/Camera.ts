import { Euler, MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type Experience from './Experience';
import type Forest from './Forest';

const WALK_HEIGHT = 1.72;
const PLAYER_RADIUS = 0.42;
const FOREST_RADIUS = 46;

export default class Camera {
  readonly instance: PerspectiveCamera;
  private readonly position = new Vector3(0, WALK_HEIGHT, 34);
  private readonly move = new Vector3();
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private yaw = 0;
  private pitch = 0;
  private stepPhase = 0;
  private bobStrength = 0;

  private settings = {
    walkSpeed: 4.2,
    sprintMultiplier: 1.75,
    flySpeed: 11,
    lookSensitivity: 0.002,
    bobAmount: 0.035,
  };

  constructor(
    private readonly experience: Experience,
    private readonly forest: Forest,
  ) {
    this.instance = new PerspectiveCamera(
      62,
      experience.sizes.width / experience.sizes.height,
      0.1,
      160,
    );
    this.instance.rotation.order = 'YXZ';
    experience.scene.add(this.instance);
    this.setupDebug();
  }

  resize(): void {
    this.instance.aspect = this.experience.sizes.width / this.experience.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update(delta: number): void {
    const controls = this.experience.controls;
    const state = controls.update();
    const look = controls.consumeLook();

    this.yaw -= look.x * this.settings.lookSensitivity;
    this.pitch = MathUtils.clamp(
      this.pitch - look.y * this.settings.lookSensitivity,
      -Math.PI * 0.48,
      Math.PI * 0.48,
    );

    const inputLength = Math.min(Math.hypot(state.forward, state.right), 1);
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.move
      .copy(this.forward)
      .multiplyScalar(state.forward)
      .addScaledVector(this.right, state.right)
      .normalize();

    if (controls.mode === 'walk') {
      const speed = this.settings.walkSpeed * (state.descend ? this.settings.sprintMultiplier : 1);
      const previousX = this.position.x;
      const previousZ = this.position.z;
      this.position.addScaledVector(this.move, speed * inputLength * delta);
      this.position.y = WALK_HEIGHT;
      this.resolveWalkCollision(previousX, previousZ);
      this.updateHeadBob(delta, inputLength, speed);
    } else {
      this.position.addScaledVector(this.move, this.settings.flySpeed * inputLength * delta);
      if (state.ascend || state.descend) {
        this.position.y += (Number(state.ascend) - Number(state.descend)) * this.settings.flySpeed * delta;
      }
      this.position.y = MathUtils.clamp(this.position.y, 1, 50);
      this.bobStrength = MathUtils.damp(this.bobStrength, 0, 10, delta);
    }

    const bob = this.reducedMotion ? 0 : Math.sin(this.stepPhase) * this.bobStrength;
    this.instance.position.copy(this.position);
    this.instance.position.y += bob;
    this.instance.position.x += Math.cos(this.stepPhase * 0.5) * this.bobStrength * 0.35;
    this.instance.rotation.copy(new Euler(this.pitch, this.yaw, 0, 'YXZ'));
  }

  private updateHeadBob(delta: number, moving: number, speed: number): void {
    const target = this.reducedMotion ? 0 : moving * this.settings.bobAmount;
    this.bobStrength = MathUtils.damp(this.bobStrength, target, moving ? 12 : 7, delta);
    if (moving > 0) this.stepPhase += delta * speed * 2.35;
  }

  private resolveWalkCollision(previousX: number, previousZ: number): void {
    const distance = Math.hypot(this.position.x, this.position.z);
    if (distance > FOREST_RADIUS) {
      const scale = FOREST_RADIUS / distance;
      this.position.x *= scale;
      this.position.z *= scale;
    }

    for (const trunk of this.forest.trunks) {
      const minimumDistance = trunk.radius + PLAYER_RADIUS;
      const dx = this.position.x - trunk.x;
      const dz = this.position.z - trunk.z;
      if (dx * dx + dz * dz < minimumDistance * minimumDistance) {
        this.position.x = previousX;
        this.position.z = previousZ;
        break;
      }
    }
  }

  private setupDebug(): void {
    const folder = this.experience.debug.ui?.addFolder('Camera');
    folder?.add(this.settings, 'walkSpeed', 1, 10, 0.1);
    folder?.add(this.settings, 'sprintMultiplier', 1, 3, 0.05);
    folder?.add(this.settings, 'flySpeed', 2, 25, 0.5);
    folder?.add(this.settings, 'lookSensitivity', 0.0005, 0.006, 0.0001);
    folder?.add(this.settings, 'bobAmount', 0, 0.1, 0.002);
  }
}
