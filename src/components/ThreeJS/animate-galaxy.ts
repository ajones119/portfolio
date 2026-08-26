import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import star from "../../assets/images/demoImages/threejs/textures/particles/2.png"

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
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const starTexture = textureLoader.load(star.src)

/**
 * Test cube
 */
const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial()
)
//scene.add(cube)

/* Generate Galaxy */
const parameters = {
    count: 1000,
    size: 0.02,
    radius: 4,
    branches: 3,
    depth: 2,
    spin: 0.1,
    randomness: 0.2,
    randomnessPower: 2,
    insideColor: '#ff6030',
    outsideColor: '#1b3984',
}

let material: THREE.PointsMaterial | null = null;
let points: THREE.Points | null = null;
let geometry: THREE.BufferGeometry | null = null;

const generateGalaxy = () => {


    if (points && geometry && material) {
        geometry?.dispose();
        material?.dispose();
        scene.remove(points);
    }

    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);

    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    for (let i = 0; i <= parameters.count; i++) {
        const vertex = i * 3;
        const branch = i % parameters.branches;
        const branchAngle = branch / parameters.branches * Math.PI * 2;
        const radius = Math.random() * parameters.radius;
    
        const spinAngle = radius * parameters.spin;
        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1);
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1);
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1);

        positions[vertex] = Math.cos(branchAngle + spinAngle) * radius + randomX;
        positions[vertex + 1] = Math.sin(branchAngle + spinAngle) * radius + randomY;
        positions[vertex + 2] = parameters.depth + randomZ;

        const mix = new THREE.Color().lerpColors(colorInside, colorOutside, radius / parameters.radius);
        colors[vertex] = mix.r;
        colors[vertex + 1] = mix.g;
        colors[vertex + 2] = mix.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));


    /* Material */
    material = new THREE.PointsMaterial({
        size: parameters.size,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
    });

    // points
    points = new THREE.Points(geometry, material);
    scene.add(points);
}

generateGalaxy();

gui.add(parameters, 'count').min(100).max(100000).step(100).onFinishChange(generateGalaxy);
gui.add(parameters, 'size').min(0.01).max(0.2).step(0.01).onFinishChange(generateGalaxy);
gui.add(parameters, 'radius').min(0.1).max(10).step(0.1).onFinishChange(generateGalaxy);
gui.add(parameters, 'branches').min(2).max(20).step(1).onFinishChange(generateGalaxy);
gui.add(parameters, 'depth').min(0.1).max(3).step(0.1).onFinishChange(generateGalaxy);
gui.add(parameters, 'spin').min(0.1).max(2).step(0.01).onFinishChange(generateGalaxy);
gui.add(parameters, 'randomness').min(0).max(1).step(0.001).onFinishChange(generateGalaxy);
gui.add(parameters, 'randomnessPower').min(1).max(10).step(0.001).onFinishChange(generateGalaxy);
gui.addColor(parameters, 'insideColor').onFinishChange(generateGalaxy);
gui.addColor(parameters, 'outsideColor').onFinishChange(generateGalaxy);

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
camera.position.z = 10
scene.add(camera)

const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(camera.position, 'z').min(-10).max(10).step(0.1).name('Camera Z');
cameraFolder.add(camera.position, 'y').min(-10).max(10).step(0.1).name('Camera Y');
cameraFolder.add(camera.position, 'x').min(-10).max(10).step(0.1).name('Camera X');

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

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    if (points) {
        points.rotation.z = - 0.1 * elapsedTime;
    }

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()