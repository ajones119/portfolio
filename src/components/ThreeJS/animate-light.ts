import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import GUI from 'lil-gui'

RectAreaLightUniformsLib.init()

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
 * Lights
 */
const ambientLight = new THREE.AmbientLight('white', 0.1)
scene.add(ambientLight)

const ambientLightFolder = gui.addFolder('Ambient Light')
ambientLightFolder.add(ambientLight, 'intensity').min(0).max(3).step(0.01).name('Ambient Light Intensity')


const directionalLight = new THREE.DirectionalLight('green', 0)
directionalLight.position.set(1, 1, 1)
scene.add(directionalLight)

const directionalLightFolder = gui.addFolder('Directional Light')
directionalLightFolder.add(directionalLight, 'intensity').min(0).max(100).step(0.1).name('Directional Light Intensity')
directionalLightFolder.add(directionalLight.position, 'x').min(-10).max(10).step(1).name('Directional Light X')
directionalLightFolder.add(directionalLight.position, 'y').min(-10).max(10).step(1).name('Directional Light Y')
directionalLightFolder.add(directionalLight.position, 'z').min(-10).max(10).step(1).name('Directional Light Z')

const hemisphereLight = new THREE.HemisphereLight('red', 'blue', 0)
const hemisphereLightFolder = gui.addFolder('Hemisphere Light')
hemisphereLightFolder.add(hemisphereLight, 'intensity').min(0).max(100).step(0.1).name('Hemisphere Light Intensity')
hemisphereLightFolder.add(hemisphereLight.position, 'x').min(-10).max(10).step(1).name('Hemisphere Light X')
hemisphereLightFolder.add(hemisphereLight.position, 'y').min(-10).max(10).step(1).name('Hemisphere Light Y')
hemisphereLightFolder.add(hemisphereLight.position, 'z').min(-10).max(10).step(1).name('Hemisphere Light Z')
scene.add(hemisphereLight)

const pointLight = new THREE.PointLight(0xffffff, 0)
pointLight.position.x = 1
pointLight.position.y = -0.5
pointLight.position.z = 1
scene.add(pointLight)

const pointLightFolder = gui.addFolder('Point Light')
pointLightFolder.add(pointLight, 'intensity').min(0).max(100).step(0.1).name('Point Light Intensity')
pointLightFolder.add(pointLight.position, 'x').min(-10).max(10).step(1).name('Point Light X')
pointLightFolder.add(pointLight.position, 'y').min(-10).max(10).step(1).name('Point Light Y')
pointLightFolder.add(pointLight.position, 'z').min(-10).max(10).step(1).name('Point Light Z')
pointLightFolder.add(pointLight, 'distance').min(0).max(10).step(0.1).name('Point Light Distance')
pointLightFolder.add(pointLight, 'decay').min(0).max(2).step(0.01).name('Point Light Decay')

const spotLight = new THREE.SpotLight(0xffffff, 0)
spotLight.position.set(2, 4, 4)
spotLight.angle = Math.PI * 0.1
spotLight.penumbra = 0.1
spotLight.target.position.set(0, 0, 0)

scene.add(spotLight)
scene.add(spotLight.target)

const spotLightFolder = gui.addFolder('Spot Light')
spotLightFolder.add(spotLight, 'intensity').min(0).max(100).step(0.1).name('Spot Light Intensity')
spotLightFolder.add(spotLight.position, 'x').min(-10).max(10).step(1).name('Spot Light X')
spotLightFolder.add(spotLight.position, 'y').min(-10).max(10).step(1).name('Spot Light Y')
spotLightFolder.add(spotLight.position, 'z').min(-10).max(10).step(1).name('Spot Light Z')
spotLightFolder.add(spotLight.target.position, 'x').min(-10).max(10).step(1).name('Spot Light Target X')
spotLightFolder.add(spotLight.target.position, 'y').min(-10).max(10).step(1).name('Spot Light Target Y')
spotLightFolder.add(spotLight.target.position, 'z').min(-10).max(10).step(1).name('Spot Light Target Z')
spotLightFolder.add(spotLight, 'angle').min(0).max(Math.PI * 0.5).step(0.01).name('Spot Light Angle')
spotLightFolder.add(spotLight, 'penumbra').min(0).max(1).step(0.01).name('Spot Light Penumbra')
spotLightFolder.add(spotLight, 'distance').min(0).max(10).step(0.1).name('Spot Light Distance')
spotLightFolder.add(spotLight, 'decay').min(0).max(2).step(0.01).name('Spot Light Decay')

const rectAreaLight = new THREE.RectAreaLight(0xffffff, 0, 2, 2)
rectAreaLight.position.set(0, 2, 0)
rectAreaLight.lookAt(0, 0, 0)
scene.add(rectAreaLight)

const rectAreaLightFolder = gui.addFolder('Rect Area Light')
rectAreaLightFolder.add(rectAreaLight, 'intensity').min(0).max(100).step(0.1).name('Rect Area Light Intensity')
rectAreaLightFolder.add(rectAreaLight, 'width').min(0).max(10).step(0.1).name('Rect Area Light Width')
rectAreaLightFolder.add(rectAreaLight, 'height').min(0).max(10).step(0.1).name('Rect Area Light Height')
rectAreaLightFolder.add(rectAreaLight.position, 'x').min(-10).max(10).step(1).name('Rect Area Light X')
rectAreaLightFolder.add(rectAreaLight.position, 'y').min(-10).max(10).step(1).name('Rect Area Light Y')
rectAreaLightFolder.add(rectAreaLight.position, 'z').min(-10).max(10).step(1).name('Rect Area Light Z')
rectAreaLightFolder.add(rectAreaLight.rotation, 'x').min(-Math.PI).max(Math.PI).step(0.1).name('Rect Area Light Rotation X')
rectAreaLightFolder.add(rectAreaLight.rotation, 'y').min(-Math.PI).max(Math.PI).step(0.1).name('Rect Area Light Rotation Y')
rectAreaLightFolder.add(rectAreaLight.rotation, 'z').min(-Math.PI).max(Math.PI).step(0.1).name('Rect Area Light Rotation Z')

/**
 * Objects
 */
// Material
const material = new THREE.MeshStandardMaterial()
material.roughness = 0.4

// Objects
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    material
)
sphere.position.x = - 1.5

const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.75, 0.75),
    material
)

const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.2, 32, 64),
    material
)
torus.position.x = 1.5

const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 5),
    material
)
plane.rotation.x = - Math.PI * 0.5
plane.position.y = - 0.65

scene.add(sphere, cube, torus, plane)

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
camera.position.x = 1
camera.position.y = 1
camera.position.z = 2
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

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update objects
    sphere.rotation.y = 0.1 * elapsedTime
    cube.rotation.y = 0.1 * elapsedTime
    torus.rotation.y = 0.1 * elapsedTime

    sphere.rotation.x = 0.15 * elapsedTime
    cube.rotation.x = 0.15 * elapsedTime
    torus.rotation.x = 0.15 * elapsedTime

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()