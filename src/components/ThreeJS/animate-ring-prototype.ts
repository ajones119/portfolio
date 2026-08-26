import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import gradient3 from '../../assets/images/demoImages/threejs/textures/gradients/3.jpg';
import SandyGradient from '../../assets/images/demoImages/threejs/sandygradient.png';

const imageLoader = new THREE.TextureLoader();
const gradient = imageLoader.load(gradient3.src);
gradient.minFilter = THREE.NearestFilter;
gradient.magFilter = THREE.NearestFilter;

const sandyGradient = imageLoader.load(SandyGradient.src);
sandyGradient.minFilter = THREE.NearestFilter;
sandyGradient.magFilter = THREE.NearestFilter;

/**
 * Debug
 */
const gui = new GUI();

const debugObject = {
    numberOfBoxes: 6,
    rotationSpeed: 0.003,
    radius: 4,
    length: 1,
    rebuild: () => {
        destroyCubes();
        createCubes(debugObject.numberOfBoxes, debugObject.radius, debugObject.length);
        centerGroupPivot(cubeGroup);
        orientCubesToCenter();
    }
}
/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/** Cube Ring */

const cubeMaterials = new THREE.MeshStandardMaterial({
    color: '#bc8a5f',
    //map: gradient,
    metalness: 0,
    roughness: 0.5,
});

const cubeGeometry = new THREE.BoxGeometry(1, 1.15, 2);
const pivot = new THREE.Group();
const cubeGroup = new THREE.Group()
pivot.add(cubeGroup)
scene.add(pivot)

const centerGroupPivot = (group: THREE.Group) => {
    const parent = group.parent;
    const savedParentRotation = parent ? parent.rotation.clone() : null;

    // setFromObject is world-space; child.position is local — mismatch while pivot rotates
    if (parent) {
        parent.rotation.set(0, 0, 0);
        parent.updateMatrixWorld(true);
    }

    group.position.set(0, 0, 0);

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());

    group.children.forEach((child) => {
        child.position.sub(center);
    });

    if (parent && savedParentRotation) {
        parent.rotation.copy(savedParentRotation);
        parent.updateMatrixWorld(true);
    }
}

const createCubes = (numberOfBoxes: number, radius = 4, length = 1) => {
    for (let i = 0; i < numberOfBoxes; i++) {
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
        const angle = i * Math.PI * 2 / numberOfBoxes;
        const cubeX = Math.cos(angle) * radius;
        const cubeZ = Math.sin(angle) * radius;
        cube.position.set(cubeX, 0, cubeZ);
        cube.scale.set(1, 1, length);
        cubeGroup.add(cube);
    }
}


const toCenter = new THREE.Vector3();
const pinkFaceNormal = new THREE.Vector3(0, 0, 1);

const orientCubesToCenter = () => {
    cubeGroup.children.forEach((child) => {
        // toCenter is the direction to the center of the cube group
        // negate is to invert the direction
        // normalize is to make the direction a unit vector
        toCenter.copy(child.position).negate().normalize();
        child.quaternion.setFromUnitVectors(pinkFaceNormal, toCenter);
    })
}


const destroyCubes = () => {
    cubeGroup.clear();
}

createCubes(debugObject.numberOfBoxes);
centerGroupPivot(cubeGroup);
orientCubesToCenter();

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

const lightControls = {
    ambientIntensity: ambientLight.intensity,
    directionalIntensity: directionalLight.intensity,
    directionalX: directionalLight.position.x,
    directionalY: directionalLight.position.y,
    directionalZ: directionalLight.position.z,
}

const ringFolder = gui.addFolder('Ring');
ringFolder.add(debugObject, 'numberOfBoxes').min(1).max(40).step(1).name('Count').onChange(debugObject.rebuild);
ringFolder.add(debugObject, 'rotationSpeed').min(0.001).max(0.01).step(0.001).name('Rotation Speed');
ringFolder.add(debugObject, 'radius').min(1).max(10).step(0.1).name('Radius').onChange(debugObject.rebuild);
ringFolder.add(debugObject, 'length').min(1).max(10).step(0.1).name('Length').onChange(debugObject.rebuild);
ringFolder.open();

const materialFolder = gui.addFolder('Material');
materialFolder.addColor(cubeMaterials, 'color');
materialFolder.add(cubeMaterials, 'metalness').min(0).max(1).step(0.01);
materialFolder.add(cubeMaterials, 'roughness').min(0).max(1).step(0.01);
materialFolder.add(cubeMaterials, 'emissiveIntensity').min(0).max(2).step(0.01).name('Emissive');
materialFolder.addColor(cubeMaterials, 'emissive').name('Emissive Color');
materialFolder.add(cubeMaterials, 'flatShading').name('Flat Shading');
materialFolder.add(cubeMaterials, 'wireframe');
materialFolder.open();

const lightingFolder = gui.addFolder('Lighting');
lightingFolder.add(lightControls, 'ambientIntensity').min(0).max(5).step(0.05).name('Ambient').onChange((value: number) => {
    ambientLight.intensity = value;
});
lightingFolder.add(lightControls, 'directionalIntensity').min(0).max(10).step(0.05).name('Directional').onChange((value: number) => {
    directionalLight.intensity = value;
});
lightingFolder.add(lightControls, 'directionalX').min(-10).max(10).step(0.1).name('Light X').onChange((value: number) => {
    directionalLight.position.x = value;
});
lightingFolder.add(lightControls, 'directionalY').min(-10).max(10).step(0.1).name('Light Y').onChange((value: number) => {
    directionalLight.position.y = value;
});
lightingFolder.add(lightControls, 'directionalZ').min(-10).max(10).step(0.1).name('Light Z').onChange((value: number) => {
    directionalLight.position.z = value;
});
lightingFolder.open();

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
camera.position.set(- 3, 3, 3)
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
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const rendererFolder = gui.addFolder('Renderer');
rendererFolder.add(renderer, 'toneMappingExposure').min(0).max(3).step(0.05).name('Exposure');

/**
 * Animate
 */
const clock = new THREE.Timer()
let oldElapsedTime = 0;
const tick = () =>
{
    const elapsedTime = clock.getElapsed()
    const delta = elapsedTime - oldElapsedTime;
    oldElapsedTime = elapsedTime;

    pivot.rotation.y -= debugObject.rotationSpeed;

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()