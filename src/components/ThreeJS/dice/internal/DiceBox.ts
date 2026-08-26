import * as THREE from 'three';

import RAPIER from '@dimforge/rapier3d-compat'
import { debounce } from './utils';
import {DiceFactory} from './DiceFactory';

const defaultConfig = {

};

type Display = {
  currentWidth: number | null;
  currentHeight: number | null;
  containerWidth: number | null;
  containerHeight: number | null;
  aspect: number | null;
  scale: number | null;
};

type CameraHeight = {
  max: number | null;
  close: number | null;
  medium: number | null;
  far: number | null;
};

type BoxBodies = {
  desk: RAPIER.RigidBody | null;
  topWall: RAPIER.RigidBody | null;
  bottomWall: RAPIER.RigidBody | null;
  leftWall: RAPIER.RigidBody | null;
  rightWall: RAPIER.RigidBody | null;
};

// DICE_FRICTION measures how much energy is lost when a dice collides with another dice
const DICE_FRICTION = 0.6;
// DICE_RESTITUTION measures how much energy is regained when a dice collides with another dice
const DICE_RESTITUTION = 0.5;
// BARRIER_RESTITUTION measures how much energy is regained when a dice collides with a barrier
const BARRIER_RESTITUTION = 1.0;

// WALL_THICKNESS is the thickness of the walls
const WALL_THICKNESS = 0.05;

class DiceBox {
  initialized = false;
  element: HTMLElement;
  dimensions: THREE.Vector2;
  last_time = 0;
  rolling = false;
  running = false;
  display: Display;
  cameraHeight: CameraHeight;
  scene: THREE.Scene;
  world: RAPIER.World | null;
  renderer: THREE.WebGLRenderer | null = null;
  shadows = true;
  box_body: BoxBodies = {
    desk: null,
    topWall: null,
    bottomWall: null,
    leftWall: null,
    rightWall: null,
  };

  /** Match Cannon dice material — used when creating dice colliders in DiceFactory */
  diceFriction = DICE_FRICTION;
  diceRestitution = DICE_RESTITUTION;

  constructor(element: HTMLElement, config: typeof defaultConfig) {
    this.element = element;
    this.dimensions = new THREE.Vector2(element.clientWidth, element.clientHeight);

    this.display = {
      currentWidth: null,
      currentHeight: null,
      containerWidth: null,
      containerHeight: null,
      aspect: null,
      scale: null
    };

    this.cameraHeight = {
      max: null,
      close: null,
      medium: null,
      far: null
    };

    this.scene = new THREE.Scene();
    this.world = null;

    // merge this with default config and any options coming in
		Object.assign(this, defaultConfig, options)

		//this.DiceColors = new DiceColors({assetPath: this.assetPath});
		this.DiceFactory = new DiceFactory({
			baseScale: this.baseScale
		});
		this.DiceFactory.setBumpMapping(true);

		// post config settings
		//this.surface = THEMES[this.theme_surface].surface
  }

  async initialize() {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.element,
      antialias: true,
      alpha: true,
    });

    this.element.appendChild(this.renderer.domElement);
    this.renderer.shadowMap.enabled = this.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    this.setDimensions();
    this.makeWorldBox();
    this.resizeWorld();

    // this.scene.add(new THREE.HemisphereLight(0xffffbb, 0x676771, 1));

    this.initialized = true;
  }

  setDimensions(dimensions = new THREE.Vector2(this.element.clientWidth, this.element.clientHeight)) {
    this.dimensions.copy(dimensions);
    this.display.containerWidth = dimensions.x;
    this.display.containerHeight = dimensions.y;
    this.display.aspect = this.display.containerWidth / this.display.containerHeight;
    this.display.scale = window.devicePixelRatio;

    if (this.renderer) {
      this.renderer.setPixelRatio(this.display.scale);
      this.renderer.setSize(this.display.containerWidth, this.display.containerHeight, false);
    }
  }

  resizeWorld() {
    const resize = () => {
      if (!this.renderer) {
        return false;
      }

      const canvas = this.renderer.domElement;
      const width = this.element.clientWidth;
      const height = this.element.clientHeight;
      const pixelRatio = window.devicePixelRatio;
      const needResize =
        canvas.width !== Math.floor(width * pixelRatio) ||
        canvas.height !== Math.floor(height * pixelRatio);

      if (needResize) {
        this.setDimensions(new THREE.Vector2(width, height));
        this.makeWorldBox();
      }

      return needResize;
    };

    resize();
    const debounceResize = debounce(resize);
    window.addEventListener('resize', debounceResize);
  }

  /**
   * Cannon used infinite Plane colliders; Rapier uses fixed thin cuboids with the same
   * positions, rotations, friction, and restitution.
   */
  makeWorldBox() {
    if (!this.world) {
      return;
    }

    this.removeWorldBox();

    const width = this.display.containerWidth ?? this.element.clientWidth;
    const height = this.display.containerHeight ?? this.element.clientHeight;
    const extent = Math.max(width, height) * 2;

    // Desk — Cannon Plane, identity rotation (normal +Z)
    this.box_body.desk = this.createFixedCollider(
      { x: extent, y: extent, z: WALL_THICKNESS },
      new THREE.Vector3(0, 0, 0),
      new THREE.Quaternion(),
      DICE_FRICTION,
      DICE_RESTITUTION
    );

    // Top wall — rotate PI/2 around X
    this.box_body.topWall = this.createFixedCollider(
      { x: extent, y: WALL_THICKNESS, z: extent },
      new THREE.Vector3(0, height * 0.93, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),
      DICE_FRICTION,
      BARRIER_RESTITUTION
    );

    // Bottom wall — rotate -PI/2 around X
    this.box_body.bottomWall = this.createFixedCollider(
      { x: extent, y: WALL_THICKNESS, z: extent },
      new THREE.Vector3(0, -height * 0.93, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2),
      DICE_FRICTION,
      BARRIER_RESTITUTION
    );

    // Left wall — rotate -PI/2 around Y
    this.box_body.leftWall = this.createFixedCollider(
      { x: WALL_THICKNESS, y: extent, z: extent },
      new THREE.Vector3(width * 0.93, 0, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2),
      DICE_FRICTION,
      BARRIER_RESTITUTION
    );

    // Right wall — rotate PI/2 around Y
    this.box_body.rightWall = this.createFixedCollider(
      { x: WALL_THICKNESS, y: extent, z: extent },
      new THREE.Vector3(-width * 0.93, 0, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
      DICE_FRICTION,
      BARRIER_RESTITUTION
    );
  }

  private removeWorldBox() {
    if (!this.world) {
      return;
    }

    for (const key of Object.keys(this.box_body) as (keyof BoxBodies)[]) {
      const body = this.box_body[key];
      if (body) {
        this.world.removeRigidBody(body);
        this.box_body[key] = null;
      }
    }
  }

  private createFixedCollider(
    halfExtents: { x: number; y: number; z: number },
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
    friction: number,
    restitution: number
  ) {
    const world = this.world!;

    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(position.x, position.y, position.z)
        .setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w })
    );

    const collider = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z)
      .setFriction(friction)
      .setRestitution(restitution);

    world.createCollider(collider, body);

    return body;
  }

  clearDice() {
		this.running = false;
		let dice;
		// while (dice = this.diceList.pop()) {
		// 	this.scene.remove(dice); 
		// 	if (dice.body) this.world.removeBody(dice.body);
		// }
		// this.renderer.render(this.scene, this.camera);

		// setTimeout(() => { this.renderer.render(this.scene, this.camera); }, 100);
	}

  roll(callback: (delta: number) => void) {
    if (!this.initialized) {
      return;
    }

    if (this.rolling) {
      return;
    }

    // this.camera.position.z = this.cameraHeight.far;
    this.clearDice();
    
    this.rolling = true;
    this.last_time = performance.now();
    callback(0);
  }
}

export default DiceBox;
