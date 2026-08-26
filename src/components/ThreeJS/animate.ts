import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import Mask from "../../assets/images/demoImages/threejs/realisticLesson/models/FlightHelmet/glTF/FlightHelmet.gltf"
import environmentMap1 from "../../assets/images/demoImages/threejs/realisticLesson/environmentMaps/1/px.png"
import environmentMap2 from "../../assets/images/demoImages/threejs/realisticLesson/environmentMaps/1/nx.png"
import environmentMap3 from "../../assets/images/demoImages/threejs/realisticLesson/environmentMaps/1/py.png"
import environmentMap4 from "../../assets/images/demoImages/threejs/realisticLesson/environmentMaps/1/ny.png"
import environmentMap5 from "../../assets/images/demoImages/threejs/realisticLesson/environmentMaps/1/pz.png"
import environmentMap6 from "../../assets/images/demoImages/threejs/realisticLesson/environmentMaps/1/nz.png"
import hdrEnvironment from "../../assets/images/demoImages/threejs/testenv2k.hdr"
import skyboxTexture from "../../assets/images/demoImages/threejs/realisticLesson/environmentMaps/blockadesLabsSkybox/interior_views_cozy_wood_cabin_with_cauldron_and_p.jpg"
import { GroundedSkybox } from 'three/examples/jsm/objects/GroundedSkybox.js'

/** Loaders */
const gltfLoader = new GLTFLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()
const hdrLoader = new HDRLoader()
const textureLoader = new THREE.TextureLoader()

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// load env map
// const envMap = cubeTextureLoader.load([
//     environmentMap1.src,
//     environmentMap2.src,
//     environmentMap3.src,
//     environmentMap4.src,
//     environmentMap5.src,
//     environmentMap6.src
// ])

const skyboxParams = {
    height: 70,
    radius: 400,
}

let skybox: GroundedSkybox | null = null
let envMap: THREE.Texture | null = null

const updateSkybox = () => {
    if (!envMap) return

    if (skybox) {
        scene.remove(skybox)
        skybox.geometry.dispose()
        ;(skybox.material as THREE.MeshBasicMaterial).dispose()
    }

    skybox = new GroundedSkybox(envMap, skyboxParams.height, skyboxParams.radius)
    //skybox.material.wireframe = true
    skybox.position.y = skyboxParams.height
    scene.add(skybox)
}

textureLoader.load(skyboxTexture.src, (loadedEnvMap) => {
    loadedEnvMap.mapping = THREE.EquirectangularReflectionMapping
    loadedEnvMap.colorSpace = THREE.SRGBColorSpace
    scene.background = loadedEnvMap
    //scene.environment = loadedEnvMap
    scene.environmentIntensity = 4
    envMap = loadedEnvMap
    //updateSkybox()
})

const skyboxFolder = gui.addFolder('Skybox')
skyboxFolder.add(skyboxParams, 'height').min(0).max(200).step(1).name('height').onChange(updateSkybox)
skyboxFolder.add(skyboxParams, 'radius').min(0).max(200).step(1).name('radius').onChange(updateSkybox)

gui.add(scene, 'environmentIntensity').min(0).max(20).step(0.01).name('environment intensity')
gui.add(scene, 'backgroundBlurriness').min(0).max(1).step(0.001).name('background blurriness')
gui.add(scene, 'backgroundIntensity').min(0).max(1).step(0.001).name('background intensity')

//environment real time
const holyDonut = new THREE.Mesh(
    new THREE.TorusGeometry(8, 0.5),
    new THREE.MeshBasicMaterial({color: new THREE.Color(10, 10, 20)})
)
holyDonut.position.y = 4
scene.add(holyDonut)

// cube render target
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { 
    type: THREE.HalfFloatType,
});

const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget)
cubeCamera.position.set(0, 0, 0);
cubeCamera.layers.set(1);
holyDonut.layers.enable(1);
scene.add(cubeCamera)

scene.environment = cubeRenderTarget.texture

const debugObject = {
    syncRotation: true
}

const debugFolder = gui.addFolder('Debug')
debugFolder.add(debugObject, 'syncRotation');

const syncRotationEnvironment = () => {
    if (debugObject.syncRotation) {
        scene.environmentRotation.x = scene.backgroundRotation.x
        scene.environmentRotation.y = scene.backgroundRotation.y
        scene.environmentRotation.z = scene.backgroundRotation.z
    }
}

const syncRotationBackground = () => {
    if (debugObject.syncRotation) {
        scene.backgroundRotation.x = scene.environmentRotation.x
        scene.backgroundRotation.y = scene.environmentRotation.y
        scene.backgroundRotation.z = scene.environmentRotation.z
    }
}


const environmentRotationFolder = gui.addFolder('Environment Rotation')
environmentRotationFolder.add(scene.environmentRotation, 'x').min(-Math.PI).max(Math.PI).step(0.001).name('rotation x').onChange(syncRotationBackground)
environmentRotationFolder.add(scene.environmentRotation, 'y').min(-Math.PI).max(Math.PI).step(0.001).name('rotation y').onChange(syncRotationBackground)
environmentRotationFolder.add(scene.environmentRotation, 'z').min(-Math.PI).max(Math.PI).step(0.001).name('rotation z').onChange(syncRotationBackground)

const backgroundRotationFolder = gui.addFolder('background Rotation')
backgroundRotationFolder.add(scene.backgroundRotation, 'x').min(-Math.PI).max(Math.PI).step(0.001).name('rotation x').onChange(syncRotationEnvironment)
backgroundRotationFolder.add(scene.backgroundRotation, 'y').min(-Math.PI).max(Math.PI).step(0.001).name('rotation y').onChange(syncRotationEnvironment)
backgroundRotationFolder.add(scene.backgroundRotation, 'z').min(-Math.PI).max(Math.PI).step(0.001).name('rotation z').onChange(syncRotationEnvironment)

/**
 * Torus Knot
 */
const torusKnot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1, 0.4, 100, 16),
    new THREE.MeshStandardMaterial({roughness: 0, metalness: 1, color: 0xaaaaaa})
)
torusKnot.position.y = 4
torusKnot.position.x = -4;
scene.add(torusKnot)

// mask
gltfLoader.load(Mask, (gltf) => {
    console.log('mask loaded')
    const mask = gltf.scene.clone()
    mask.scale.set(10, 10, 10)
    mask.position.set(0, 0, 0)
    scene.add(mask)
})

/**
 * Lights
 */



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
camera.position.set(4, 5, 4)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.y = 3.5
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
    // Time
    const elapsedTime = clock.getElapsedTime()

    //real time env map
    if (holyDonut) {
        holyDonut.rotation.x = Math.sin(elapsedTime) * 4

        cubeCamera.update(renderer, scene)
    }

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()