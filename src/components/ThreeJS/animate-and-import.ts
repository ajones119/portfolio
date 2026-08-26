import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

import Duck from "../../assets/images/demoImages/threejs/models/Duck/glTF/Duck.gltf";
import FlightHelmet from "../../assets/images/demoImages/threejs/models/FlightHelmet/glTF/FlightHelmet.gltf"
import Fox from "../../assets/images/demoImages/threejs/models/Fox/glTF/Fox.gltf"
import Burger from "../../assets/images/demoImages/threejs/models/Burger/burger.gltf"
import {GLTFLoader, type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js'
import chairModel from "../../assets/images/demoImages/threejs/models/vintage_day_bed_4k.blend/vintage_day_bed_4k.gltf"


/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene    
const scene = new THREE.Scene()


const loader = new GLTFLoader()
const loadingManager = new THREE.LoadingManager()

let mixer: THREE.AnimationMixer | null = null;
let gltfModel: GLTF | null = null;
let currentAction: THREE.AnimationAction | null = null;

const playAction = (clip: THREE.AnimationClip | undefined, fadeDuration = 0.5) => {
    if (!mixer || !clip) return

    const newAction = mixer.clipAction(clip)
    if (newAction === currentAction) return

    newAction.reset()
    newAction.play()

    if (currentAction) {
        currentAction.crossFadeTo(newAction, fadeDuration)
    } else {
        newAction.fadeIn(fadeDuration)
    }

    currentAction = newAction
}

loader.load(chairModel,
    (gltf) => {
        console.log('success loading chair model')
        gltf.scene.position.set(0, 0, -2)
        scene.add(gltf.scene)
    },//success
    (xhr) => {
        console.log(`progress loading chair model: ${xhr.loaded} / ${xhr.total}`)
    },//progress
    (error) => {
        console.log('error loading chair model')
        console.log(error)
    }//error
)

loader.load(Fox,
    (gltf) => {
        console.log('success')
        mixer = new THREE.AnimationMixer(gltf.scene)
        gltfModel = gltf;
        playAction(gltf.animations[0], 0)

        gltf.scene.scale.set(0.01, 0.01, 0.01)
        scene.add(gltf.scene)
        //scene.add(...gltf.scene.children.map(child => child.clone()))
    },//success
    () => {},//progress
    () => {}//error
)

loader.load(Burger,
    (gltf) => {
        
        gltf.scene.scale.set(0.03, 0.03, 0.03)
        gltf.scene.position.set(0, 0, 1)
        scene.add(gltf.scene)
    },//success
    () => {},//progress
    () => {}//error
)

window.addEventListener('keydown', (event) => {
    if (event.key === 'a') {
        playAction(gltfModel?.animations[1])
    } else if (event.key === 'd') {
        playAction(gltfModel?.animations[2])
    }
})

window.addEventListener('keyup', (event) => {
    if (event.key === 'a' || event.key === 'd') {
        playAction(gltfModel?.animations[0])
    }
})

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#444444',
        metalness: 0,
        roughness: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.4)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8)
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
camera.position.set(2, 2, 2)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0.75, 0)
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
const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    //update mixer
    mixer?.update(deltaTime)

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()