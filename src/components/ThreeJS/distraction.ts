import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'


/**
 * Debug
 */
const gui = new GUI();

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/** Rectangle Ring */

const rectangleMaterials = [
    new THREE.MeshStandardMaterial({ color: '#FF0000' }),
    new THREE.MeshStandardMaterial({ color: '#00FF00' }),
    new THREE.MeshStandardMaterial({ color: '#0000FF' }),
    new THREE.MeshStandardMaterial({ color: '#FFFF00' }),
    new THREE.MeshStandardMaterial({ color: '#FF00FF' }),
    new THREE.MeshStandardMaterial({ color: '#00FFFF' }),
];
const rectangleGeometry = new THREE.BoxGeometry(1.2, 0.5, 0.15);
const pivot = new THREE.Group();
const ringGroup = new THREE.Group();
pivot.add(ringGroup);
scene.add(pivot);

const pinkFaceNormal = new THREE.Vector3(0, 0, 1);
const toCenter = new THREE.Vector3();

const debugObject = {
    numberOfRectangles: 8,
    ringRadius: 3,
    rotationSpeed: 0.003,
    recenter: () => {
        centerGroupPivot(ringGroup);
        orientRectanglesToCenter();
    }
}

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

const orientRectanglesToCenter = () => {
    ringGroup.children.forEach((child) => {
        toCenter.copy(child.position).negate().normalize();
        child.quaternion.setFromUnitVectors(pinkFaceNormal, toCenter);
    });
}

const createRectangles = (count: number, radius: number) => {
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const rectangle = new THREE.Mesh(
            rectangleGeometry,
            rectangleMaterials
        );
        rectangle.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );
        ringGroup.add(rectangle);
    }
}

const destroyRectangles = () => {
    ringGroup.clear();
}

const rebuildRing = () => {
    destroyRectangles();
    createRectangles(debugObject.numberOfRectangles, debugObject.ringRadius);
    centerGroupPivot(ringGroup);
    orientRectanglesToCenter();
}

gui.add(debugObject, 'numberOfRectangles').min(1).max(24).step(1).name('Count').onChange(rebuildRing);
gui.add(debugObject, 'ringRadius').min(1).max(8).step(0.5).name('Ring Radius').onChange(rebuildRing);
gui.add(debugObject, 'rotationSpeed').min(0.001).max(0.02).step(0.001).name('Rotation Speed');
gui.add(debugObject, 'recenter').name('Recenter');

rebuildRing();

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

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

    //pivot.rotation.y -= debugObject.rotationSpeed;

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
