import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import Duck from "../../assets/images/demoImages/threejs/models/Duck/glTF-Binary/Duck.glb"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import GSAP from 'gsap'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

//models
const loader = new GLTFLoader()
let duckModel: THREE.Object3D | null = null;
loader.load(Duck, (gltf) => {
    console.log('duckModel loaded')
    duckModel = gltf.scene
    duckModel.position.y = -1
    scene.add(duckModel)
})

//lights
const ambientLight = new THREE.AmbientLight(0xffffff, 3)
scene.add(ambientLight)

/**
 * Objects
 */
const object1 = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#ff0000' })
)
object1.position.x = - 2

const object2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#ff0000' })
)

const object3 = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#ff0000' })
)
object3.position.x = 2

scene.add(object1, object2, object3)

/**
 * Raycaster
 */
const raycaster = new THREE.Raycaster()

// const rayOrigin = new THREE.Vector3(-3, 0, 0)
// const rayDirection = new THREE.Vector3(10, 0, 0)
// rayDirection.normalize();

// raycaster.set(rayOrigin, rayDirection);

// const intersectObject = raycaster.intersectObject(object2);
// console.log(intersectObject);

// const intersects = raycaster.intersectObjects(scene.children);
// console.log(intersects);



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
camera.position.z = 3
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

// mouse handle
const mouse = new THREE.Vector2()
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / sizes.width) * 2 - 1
    mouse.y = -(event.clientY / sizes.height) * 2 + 1
})

let currentIntersectedObject: THREE.Object3D | null = null;

//click
window.addEventListener('click', () => {
    if (currentIntersectedObject) {
        console.log('clicked', currentIntersectedObject)
    }
})

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // wave spheres
    object1.position.y = Math.sin(elapsedTime) * 1.5
    object2.position.y = Math.cos(elapsedTime) * 1.5
    object3.position.y = Math.sin(elapsedTime/2) * 1.5

    // raycaster
    // const origin = new THREE.Vector3(-3, 0, 0);
    // const direction = new THREE.Vector3(1, 0, 0);
    // direction.normalize();
    // raycaster.set(origin, direction);
    // const intersects = raycaster.intersectObjects(scene.children);

    // if (intersects.length > 0) {
    //     for (const intersect of intersects) {
    //         intersect.object.material.color.set('#00ff00')
    //     }
    // } else {
    //     object1.material.color.set('#ff0000')
    //     object2.material.color.set('#ff0000')
    //     object3.material.color.set('#ff0000')
    // }

    // mouse check
    raycaster.setFromCamera(mouse, camera)
    const objectsToTest = [object1, object2, object3]

    const intersects = raycaster.intersectObjects(objectsToTest)
    for (const object of objectsToTest) {
        object.material.color.set('#ff0000')
    }

    for (const intersect of intersects) {
        intersect.object.material.color.set('#00ff00')
        //break;
    }

    if (intersects.length > 0) {
        if (currentIntersectedObject !== intersects[0].object) {
            //console.log('mouseenter')
            currentIntersectedObject = intersects[0].object;
        }
    } else {
        if (currentIntersectedObject) {
            //console.log('mouseleave')
            currentIntersectedObject = null;
        }
    }

    if (duckModel && mouse.x !== 0 && mouse.y !== 0) {
        const intersectDuck = raycaster.intersectObject(duckModel)
        //console.log('intersectDuck', intersectDuck)
        if (intersectDuck.length > 0) {
            //console.log('intersected duck')
            //duckModel.scale.set(1.1, 1.1, 1.1)
            GSAP.to(duckModel.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.5 });
        } else {
            //console.log('no intersected duck')
            //duckModel.scale.set(1, 1, 1)
            GSAP.to(duckModel.scale, { x: 1, y: 1, z: 1, duration: 0.5 });
        }
    }


    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()