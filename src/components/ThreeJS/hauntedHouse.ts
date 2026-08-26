import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

import { Sky } from 'three/examples/jsm/objects/Sky.js'


//floor textures
import floorAlpha from '../../assets/images/demoImages/threejs/hauntedHouse/floor/alpha.webp';
import floorARM from '../../assets/images/demoImages/threejs/hauntedHouse/floor/coast_sand_rocks_02_1k/coast_sand_rocks_02_arm_1k.webp';
import floorDiffuse from '../../assets/images/demoImages/threejs/hauntedHouse/floor/coast_sand_rocks_02_1k/coast_sand_rocks_02_diff_1k.webp';
import floorDisplacement from '../../assets/images/demoImages/threejs/hauntedHouse/floor/coast_sand_rocks_02_1k/coast_sand_rocks_02_disp_1k.webp';
import floorNormal from '../../assets/images/demoImages/threejs/hauntedHouse/floor/coast_sand_rocks_02_1k/coast_sand_rocks_02_nor_gl_1k.webp';

//housr textures
import wallDiffuse from '../../assets/images/demoImages/threejs/hauntedHouse/wall/castle_brick_broken_06_1k/castle_brick_broken_06_diff_1k.webp';
import wallARM from '../../assets/images/demoImages/threejs/hauntedHouse/wall/castle_brick_broken_06_1k/castle_brick_broken_06_arm_1k.webp';
import wallNormal from '../../assets/images/demoImages/threejs/hauntedHouse/wall/castle_brick_broken_06_1k/castle_brick_broken_06_nor_gl_1k.webp';

import roofDiffuse from '../../assets/images/demoImages/threejs/hauntedHouse/roof/roof_slates_02_1k/roof_slates_02_diff_1k.webp';
import roofARM from '../../assets/images/demoImages/threejs/hauntedHouse/roof/roof_slates_02_1k/roof_slates_02_arm_1k.webp';
import roofNormal from '../../assets/images/demoImages/threejs/hauntedHouse/roof/roof_slates_02_1k/roof_slates_02_arm_1k.webp';

import doorColor from '../../assets/images/demoImages/threejs/hauntedHouse/door/color.webp';
import doorNormal from '../../assets/images/demoImages/threejs/hauntedHouse/door/normal.webp';
import doorRoughness from '../../assets/images/demoImages/threejs/hauntedHouse/door/roughness.webp';
import doorMetalness from '../../assets/images/demoImages/threejs/hauntedHouse/door/metalness.webp';
import doorAmbient from '../../assets/images/demoImages/threejs/hauntedHouse/door/ambientOcclusion.webp';
import doorAlpha from '../../assets/images/demoImages/threejs/hauntedHouse/door/alpha.webp';
import doorHeight from '../../assets/images/demoImages/threejs/hauntedHouse/door/height.webp';

import bushDiffuse from '../../assets/images/demoImages/threejs/hauntedHouse/bush/leaves_forest_ground_1k/leaves_forest_ground_diff_1k.webp';
import bushARM from '../../assets/images/demoImages/threejs/hauntedHouse/bush/leaves_forest_ground_1k/leaves_forest_ground_arm_1k.webp';
import bushNormal from '../../assets/images/demoImages/threejs/hauntedHouse/bush/leaves_forest_ground_1k/leaves_forest_ground_nor_gl_1k.webp';

import graveDiffuse from '../../assets/images/demoImages/threejs/hauntedHouse/grave/plastered_stone_wall_1k/plastered_stone_wall_diff_1k.webp';
import graveARM from '../../assets/images/demoImages/threejs/hauntedHouse/grave/plastered_stone_wall_1k/plastered_stone_wall_arm_1k.webp';
import graveNormal from '../../assets/images/demoImages/threejs/hauntedHouse/grave/plastered_stone_wall_1k/plastered_stone_wall_nor_gl_1k.webp';

const textureLoader = new THREE.TextureLoader();
const floorAlphaTexture = textureLoader.load(floorAlpha.src);
floorAlphaTexture.colorSpace = THREE.SRGBColorSpace;

const floorARMTexture = textureLoader.load(floorARM.src);
floorARMTexture.colorSpace = THREE.SRGBColorSpace;
floorARMTexture.repeat.set(10, 10);
floorARMTexture.wrapS = THREE.RepeatWrapping;
floorARMTexture.wrapT = THREE.RepeatWrapping;

const floorDiffuseTexture = textureLoader.load(floorDiffuse.src);
floorDiffuseTexture.colorSpace = THREE.SRGBColorSpace;
floorDiffuseTexture.repeat.set(10, 10);
floorDiffuseTexture.wrapS = THREE.RepeatWrapping;
floorDiffuseTexture.wrapT = THREE.RepeatWrapping;

const floorDisplacementTexture = textureLoader.load(floorDisplacement.src);
floorDisplacementTexture.colorSpace = THREE.SRGBColorSpace;
floorDisplacementTexture.repeat.set(10, 10);
floorDisplacementTexture.wrapS = THREE.RepeatWrapping;
floorDisplacementTexture.wrapT = THREE.RepeatWrapping;

const floorNormalTexture = textureLoader.load(floorNormal.src);
floorNormalTexture.repeat.set(8, 8);
floorNormalTexture.wrapS = THREE.RepeatWrapping;
floorNormalTexture.wrapT = THREE.RepeatWrapping;


//wall textures
const wallDiffuseTexture = textureLoader.load(wallDiffuse.src);
wallDiffuseTexture.colorSpace = THREE.SRGBColorSpace;
wallDiffuseTexture.repeat.set(1, 1);
wallDiffuseTexture.wrapS = THREE.RepeatWrapping;
wallDiffuseTexture.wrapT = THREE.RepeatWrapping;

const wallARMTexture = textureLoader.load(wallARM.src);
wallARMTexture.colorSpace = THREE.SRGBColorSpace;
wallARMTexture.repeat.set(1, 1);
wallARMTexture.wrapS = THREE.RepeatWrapping;
wallARMTexture.wrapT = THREE.RepeatWrapping;

const wallNormalTexture = textureLoader.load(wallNormal.src);
wallNormalTexture.repeat.set(1, 1);
wallNormalTexture.wrapS = THREE.RepeatWrapping;
wallNormalTexture.wrapT = THREE.RepeatWrapping;

//roof textures
const roofDiffuseTexture = textureLoader.load(roofDiffuse.src);
roofDiffuseTexture.colorSpace = THREE.SRGBColorSpace;
roofDiffuseTexture.repeat.set(3, 1);
roofDiffuseTexture.wrapS = THREE.RepeatWrapping;
roofDiffuseTexture.wrapT = THREE.RepeatWrapping;

const roofARMTexture = textureLoader.load(roofARM.src);
roofARMTexture.colorSpace = THREE.SRGBColorSpace;
roofARMTexture.repeat.set(3, 1);
roofARMTexture.wrapS = THREE.RepeatWrapping;
roofARMTexture.wrapT = THREE.RepeatWrapping;

const roofNormalTexture = textureLoader.load(roofNormal.src);
roofNormalTexture.repeat.set(3, 1);
roofNormalTexture.wrapS = THREE.RepeatWrapping;
roofNormalTexture.wrapT = THREE.RepeatWrapping;


const doorColorTexture = textureLoader.load(doorColor.src);
doorColorTexture.colorSpace = THREE.SRGBColorSpace;

doorColorTexture.wrapS = THREE.RepeatWrapping;
doorColorTexture.wrapT = THREE.RepeatWrapping;


const doorNormalTexture = textureLoader.load(doorNormal.src);

doorNormalTexture.wrapS = THREE.RepeatWrapping;
doorNormalTexture.wrapT = THREE.RepeatWrapping;

const doorRoughnessTexture = textureLoader.load(doorRoughness.src);

doorRoughnessTexture.wrapS = THREE.RepeatWrapping;
doorRoughnessTexture.wrapT = THREE.RepeatWrapping;

const doorMetalnessTexture = textureLoader.load(doorMetalness.src);

doorMetalnessTexture.wrapS = THREE.RepeatWrapping;
doorMetalnessTexture.wrapT = THREE.RepeatWrapping;

const doorAmbientTexture = textureLoader.load(doorAmbient.src);

doorAmbientTexture.wrapS = THREE.RepeatWrapping;
doorAmbientTexture.wrapT = THREE.RepeatWrapping;

const doorAlphaTexture = textureLoader.load(doorAlpha.src);

doorAlphaTexture.wrapS = THREE.RepeatWrapping;
doorAlphaTexture.wrapT = THREE.RepeatWrapping;

const doorHeightTexture = textureLoader.load(doorHeight.src);
doorHeightTexture.colorSpace = THREE.SRGBColorSpace;
doorHeightTexture.wrapS = THREE.RepeatWrapping;
doorHeightTexture.wrapT = THREE.RepeatWrapping;


//grave textures
const graveDiffuseTexture = textureLoader.load(graveDiffuse.src);
graveDiffuseTexture.colorSpace = THREE.SRGBColorSpace;
graveDiffuseTexture.repeat.set(1, 1);
graveDiffuseTexture.wrapS = THREE.RepeatWrapping;
graveDiffuseTexture.wrapT = THREE.RepeatWrapping;

const graveARMTexture = textureLoader.load(graveARM.src);
graveARMTexture.colorSpace = THREE.SRGBColorSpace;
graveARMTexture.repeat.set(1, 1);
graveARMTexture.wrapS = THREE.RepeatWrapping;
graveARMTexture.wrapT = THREE.RepeatWrapping;

const graveNormalTexture = textureLoader.load(graveNormal.src);
graveNormalTexture.repeat.set(1, 1);
graveNormalTexture.wrapS = THREE.RepeatWrapping;
graveNormalTexture.wrapT = THREE.RepeatWrapping;

//bush textures
const bushDiffuseTexture = textureLoader.load(bushDiffuse.src);
bushDiffuseTexture.colorSpace = THREE.SRGBColorSpace;
bushDiffuseTexture.repeat.set(0.5, 0.5);
bushDiffuseTexture.wrapS = THREE.RepeatWrapping;
bushDiffuseTexture.wrapT = THREE.RepeatWrapping;

const bushARMTexture = textureLoader.load(bushARM.src);
bushARMTexture.colorSpace = THREE.SRGBColorSpace;

const bushNormalTexture = textureLoader.load(bushNormal.src);
bushNormalTexture.repeat.set(1, 1);
bushNormalTexture.wrapS = THREE.RepeatWrapping;
bushNormalTexture.wrapT = THREE.RepeatWrapping;

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * House
 */

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20, 100, 100),
  new THREE.MeshStandardMaterial({
    alphaMap: floorAlphaTexture,
    transparent: true,
    map: floorDiffuseTexture,
    aoMap: floorARMTexture,
    displacementMap: floorDisplacementTexture,
    displacementScale: 0.3,
    displacementBias: -0.15,
    normalMap: floorNormalTexture,
    roughnessMap: floorARMTexture,
    metalnessMap: floorARMTexture,
    //wireframe: true
  }),
);
floor.rotation.x = Math.PI * 1.5

gui.add(floor.material, 'displacementScale').min(0).max(1).step(0.01);
gui.add(floor.material, 'displacementBias').min(-1).max(1).step(0.01);

scene.add(floor);
const floorFolder = gui.addFolder('Floor');
floorFolder.add(floor.material, 'roughness').min(0).max(3).step(0.1);

// house group
const houseGroup = new THREE.Group();
scene.add(houseGroup);

// walls
const WALLS_SIZES = {
  width: 4,
  height: 2.5,
  depth: 4
}
const walls = new THREE.Mesh(
  new THREE.BoxGeometry(WALLS_SIZES.width, WALLS_SIZES.height, WALLS_SIZES.depth),
  new THREE.MeshStandardMaterial({
    map: wallDiffuseTexture,
    aoMap: wallARMTexture,
    normalMap: wallNormalTexture,
    roughnessMap: wallARMTexture,
    metalnessMap: wallARMTexture,
  })
);
walls.position.y += WALLS_SIZES.height / 2;
houseGroup.add(walls);


const ROOF_SIZES = {
  radius: 3.25,
  height: 2,
  segments: 4
}
const roof = new THREE.Mesh(
  new THREE.ConeGeometry(ROOF_SIZES.radius, ROOF_SIZES.height, ROOF_SIZES.segments),
  new THREE.MeshStandardMaterial({
    map: roofDiffuseTexture,
    aoMap: roofARMTexture,
    normalMap: roofNormalTexture,
    roughnessMap: roofARMTexture,
    metalnessMap: roofARMTexture,
  })
)
roof.position.y = WALLS_SIZES.height + ROOF_SIZES.height / 2;
roof.rotation.y = Math.PI * 0.25;

houseGroup.add(roof);

const doorSizes = {
  width: 2,
  height: 2,
  depth: 0.1
}
const door = new THREE.Mesh(
  new THREE.PlaneGeometry(doorSizes.width, doorSizes.height),
  new THREE.MeshStandardMaterial({ 
    map: doorColorTexture,
    aoMap: doorAmbientTexture,
    normalMap: doorNormalTexture,
    roughnessMap: doorRoughnessTexture,
    metalnessMap: doorMetalnessTexture,
    alphaMap: doorAlphaTexture,
    transparent: true,
    side: THREE.DoubleSide,
    displacementMap: doorHeightTexture,
    displacementScale: 0.2,
    displacementBias: 0.01,
  })
)
door.position.y = doorSizes.height / 2;
door.position.z = 2 + 0.01;

houseGroup.add(door);


// bushes
const bushGeometry = new THREE.SphereGeometry(1, 16, 16);
const bushMaterial = new THREE.MeshStandardMaterial({ 
  map: bushDiffuseTexture,
  aoMap: bushARMTexture,
  normalMap: bushNormalTexture,
  roughnessMap: bushARMTexture,
  metalnessMap: bushARMTexture,
  color: '#ccffcc'
});
const bush = new THREE.Mesh(bushGeometry, bushMaterial);
bush.scale.set(0.5, 0.5, 0.5)
bush.position.set(0.8, 0.2, 2.2)
houseGroup.add(bush);
bush.rotation.y = -Math.PI * 0.25;

const bush2 = bush.clone();
bush2.scale.set(0.25, 0.25, 0.25)
bush2.position.set(1.4, 0.1, 2.1)
houseGroup.add(bush2);
bush2.rotation.y = -Math.PI * 0.25;

const bush3 = bush.clone();
bush3.scale.set(0.4, 0.4, 0.4)
bush3.position.set(-0.8, 0.1, 2.2)
houseGroup.add(bush3);
bush3.rotation.y = -Math.PI * 0.25;

const bush4 = bush.clone();
bush4.scale.set(0.15, 0.15, 0.15)
bush4.position.set(-1, 0.05, 2.6)
houseGroup.add(bush4);
bush4.rotation.y = -Math.PI * 0.25;

// graves
const GRAVE_SIZES = {
  width: 0.6,
  height: 1,
  depth: 0.2
}
const graveGeometry = new THREE.BoxGeometry(GRAVE_SIZES.width, GRAVE_SIZES.height, GRAVE_SIZES.depth);
const graveMaterial = new THREE.MeshStandardMaterial({ 
  map: graveDiffuseTexture,
  aoMap: graveARMTexture,
  normalMap: graveNormalTexture,
  roughnessMap: graveARMTexture,
  metalnessMap: graveARMTexture,
  //color: 'brown'
});
const NUM_OF_GRAVES = 30;
const graves = new THREE.Group();
for (let i = 0; i < NUM_OF_GRAVES; i++) {
  const angle = Math.random() * Math.PI * 2;
  const x = Math.sin(angle);
  const z = Math.cos(angle);
  const grave = new THREE.Mesh(graveGeometry, graveMaterial);
  const radius = Math.random() * 5 + WALLS_SIZES.width/2 + (3 * GRAVE_SIZES.width);

  grave.position.x = x * radius;
  grave.position.z = z * radius;
  grave.position.y = GRAVE_SIZES.height / 3;

  grave.rotation.y = Math.random() * Math.PI * 2;
  grave.rotation.z = Math.random() * Math.PI * 0.12;
  grave.rotation.x = Math.random() * Math.PI * 0.12;
  graves.add(grave);
}
houseGroup.add(graves);

/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.AmbientLight('#86cdff', 0.275)
scene.add(ambientLight)

// Directional light
const directionalLight = new THREE.DirectionalLight('#86cdff', 1)
directionalLight.position.set(3, 2, -8)
scene.add(directionalLight)

gui.add(directionalLight, 'intensity').min(0).max(10).step(0.1).name('Directional Light Intensity')

gui.add(ambientLight, 'intensity').min(0).max(10).step(0.1).name('Ambient Light Intensity')

const doorLight = new THREE.PointLight('#ff7d46', 2)
doorLight.position.set(0, 2.2, 2.5)
scene.add(doorLight)

gui.add(doorLight, 'intensity').min(0).max(10).step(0.1).name('Door Light Intensity')

// Ghosts
const ghost1 = new THREE.PointLight('#8800ff', 6)
const ghost2 = new THREE.PointLight('cyan', 6)
const ghost3 = new THREE.PointLight('lime', 6)

scene.add(ghost1, ghost2, ghost3)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 4
camera.position.y = 2
camera.position.z = 5
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

ghost1.castShadow = true;
ghost2.castShadow = true;
ghost3.castShadow = true;

//doorLight.castShadow = true;
directionalLight.castShadow = true;

walls.receiveShadow = true;
walls.castShadow = true;
roof.receiveShadow = true;
roof.castShadow = true;
floor.receiveShadow = true;

for (const grave of graves.children) {
  grave.receiveShadow = true;
  grave.castShadow = true;
}

//mapping
directionalLight.shadow.mapSize.set(256, 256);
directionalLight.shadow.camera.top = 8;
directionalLight.shadow.camera.bottom = -8;
directionalLight.shadow.camera.left = -8;
directionalLight.shadow.camera.right = 8;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 20;

//SKY
const sky = new Sky();
sky.scale.set(100, 100, 100);
sky.material.uniforms.turbidity.value = 10;
sky.material.uniforms.rayleigh.value = 3;
sky.material.uniforms.mieCoefficient.value = 0.01;
sky.material.uniforms.mieDirectionalG.value = 0.95;
sky.material.uniforms.sunPosition.value.set(0.3, -0.038, -0.951);

scene.add(sky);

const fog = new THREE.FogExp2('#0234f', 0.1);
scene.fog = fog;

/**
 * Animate
 */
const timer = new THREE.Timer()

const tick = () =>
{
    // Timer
    timer.update()
    const elapsedTime = timer.getElapsed()

    // ghost
    const ghostAngle = elapsedTime * 0.5;
    ghost1.position.x = Math.sin(ghostAngle) * 5;
    ghost1.position.z = Math.cos(ghostAngle) * 5;
    ghost1.position.y = Math.sin(ghostAngle) * Math.sin(ghostAngle * 2.34) * Math.sin(ghostAngle * 3.45);

    const ghostAngle2 = elapsedTime * 0.5 + Math.PI * 0.25;

    ghost2.position.x = -Math.sin(ghostAngle2) * 3;
    ghost2.position.z = -Math.cos(ghostAngle2) * 6;
    ghost2.position.y = Math.sin(ghostAngle2) * Math.sin(ghostAngle2 * 2.34) * Math.sin(ghostAngle2 * 3.45);


    const ghostAngle3 = elapsedTime * 0.5 + Math.PI * 0.5;
    ghost3.position.x = -Math.sin(ghostAngle3) * 5;
    ghost3.position.z = Math.cos(ghostAngle3) * 4;
    ghost3.position.y = Math.sin(ghostAngle3) * Math.sin(ghostAngle3 * 2.34) * Math.sin(ghostAngle3 * 3.45);

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()