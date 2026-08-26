import * as THREE from 'three'
import GUI from 'lil-gui'
import gradient from '../../assets/images/demoImages/threejs/textures/gradients/3.jpg'
import gsap from 'gsap'

/**
 * Debug
 */
const gui = new GUI()

const parameters = {
    materialColor: '#ffeded'
}

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Test cube
 */
const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: '#ff0000' })
)
//scene.add(cube)

//texture
const textureLoader = new THREE.TextureLoader()
const gradientTexture = textureLoader.load(gradient.src)
//gradientTexture.minFilter = THREE.NearestFilter;
gradientTexture.magFilter = THREE.NearestFilter;

// material
const material = new THREE.MeshToonMaterial({ color: parameters.materialColor, gradientMap: gradientTexture })

gui
    .addColor(parameters, 'materialColor')
    .onChange((value: any) => {
        material.color.set(value);
        material.needsUpdate = true;

        particlesMaterial.color.set(value);
        particlesMaterial.needsUpdate = true;
    })

// meshes
const mesh1 = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.4, 16, 60),
    material
)
const mesh2 = new THREE.Mesh(
    new THREE.ConeGeometry(1, 2, 32),
    material
)
const mesh3 = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1, 0.4, 16, 60),
    material
)

const objectsDistance = 4;

mesh1.position.y = 0 * objectsDistance;
mesh1.position.x = 2;
//mesh1.scale.set(0.5, 0.5, 0.5);

mesh2.position.y = -1 * objectsDistance;
mesh2.position.x = -2;
//mesh2.scale.set(0.5, 0.5, 0.5);

mesh3.position.y = -2 * objectsDistance;
//mesh3.scale.set(0.5, 0.5, 0.5);

const sectionMeshes = [mesh1, mesh2, mesh3];

scene.add(...sectionMeshes)


// particles
const count = 500;
const positions = new Float32Array(count * 3);
const particlesGeometry = new THREE.BufferGeometry();

for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = objectsDistance * 0.5 - Math.random() * objectsDistance * 4;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.05,
    sizeAttenuation: true,
    color: parameters.materialColor,
})

const particles = new THREE.Points(particlesGeometry, particlesMaterial)

scene.add(particles)

/**
 * Lights — MeshToonMaterial is lit; without lights meshes render black
 */
const ambientLight = new THREE.AmbientLight('#ffffff', 0.4)
const directionalLight = new THREE.DirectionalLight('#ffffff', 1)
directionalLight.position.set(1, 1, 0)
scene.add(ambientLight, directionalLight)

gui.add(directionalLight, 'intensity').min(0).max(10).step(0.1).name('Directional Light Intensity')

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
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.z = 6

const cameraGroup = new THREE.Group();
scene.add(cameraGroup);
cameraGroup.add(camera)

let scrollY = window.scrollY;
let maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
let progress = scrollY / maxScrollY;

window.addEventListener('scroll', (event) => {
    scrollY = window.scrollY;
    maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
    progress = scrollY / maxScrollY;

    const newSection = Math.round(scrollY / sizes.height);
    if (newSection !== currentSection) {
        currentSection = newSection;
        console.log(newSection);
        gsap.to(sectionMeshes[newSection].rotation, {
            duration: 1.5,
            ease: 'power2.inOut',
            x: '+=6',
            y: '+=3',
        });
    }
})

const cursor = {
    x: 0,
    y: 0
}

window.addEventListener('mousemove', (event) => {
    cursor.x = event.clientX / sizes.width - 0.5;
    cursor.y = event.clientY / sizes.height - 0.5;
})

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0;
let currentSection = 0;

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    // animate camera
    camera.position.y = -scrollY / sizes.height * objectsDistance;

    // animate cursor
    const parallaxX = -cursor.x;
    const parallaxY = cursor.y;

    cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * 1 * deltaTime;
    cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * 1 * deltaTime;

    for (const mesh of sectionMeshes) {
        mesh.rotation.y += -0.15 * deltaTime;
        mesh.rotation.x += -0.15 * deltaTime;
    }

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()