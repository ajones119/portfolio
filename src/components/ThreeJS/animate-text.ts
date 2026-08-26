import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import typefaceFont from 'three/examples/fonts/helvetiker_regular.typeface.json'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import matcapFile from '../../assets/images/demoImages/threejs/textures/matcaps/8.png';

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
const matcapTexture = textureLoader.load(matcapFile.src);
matcapTexture.colorSpace = THREE.SRGBColorSpace;

const fontLoader = new FontLoader()
const font = fontLoader.parse(typefaceFont)

const textGeometry = new TextGeometry('Hello Three.js', {
  font,
  size: 0.5,
  depth: 0.2,
  curveSegments: 8,
  bevelEnabled: true,
  bevelOffset: 0,
  bevelSegments: 3,
  bevelThickness: 0.03,
  bevelSize: 0.02,
})

const textMaterial = new THREE.MeshMatcapMaterial({ matcap: matcapTexture })
const textMesh = new THREE.Mesh(textGeometry, textMaterial)

// center the anchor on the text
textGeometry.center()
// textGeometry.computeBoundingBox()
// const centerOffset = new THREE.Vector3()
// centerOffset.x = - (textGeometry.boundingBox?.max.x || 0) * 0.5
// centerOffset.y = - (textGeometry.boundingBox?.max.y || 0) * 0.5
// centerOffset.z = - (textGeometry.boundingBox?.max.z || 0) * 0.5
// textGeometry.translate(centerOffset.x, centerOffset.y, centerOffset.z)  


scene.add(textMesh)

const axesHeper = new THREE.AxesHelper()
//scene.add(axesHeper)
const donutGeometry = new THREE.TorusGeometry(0.3, 0.2, 20, 45)
const donutMaterial = new THREE.MeshMatcapMaterial({ matcap: matcapTexture })


for (let i = 0; i < 100; i++) {
  const donutGeometry = new THREE.TorusGeometry(0.3, 0.2, 20, 45)
  const donutMaterial = new THREE.MeshMatcapMaterial({ matcap: matcapTexture })
  const donutMesh = new THREE.Mesh(donutGeometry, donutMaterial)

  donutMesh.position.x = (Math.random() - 0.5) * 10;
  donutMesh.position.y = (Math.random() - 0.5) * 10;
  donutMesh.position.z = (Math.random() - 0.5) * 10;
  donutMesh.rotation.x = Math.random() * Math.PI * 2;
  donutMesh.rotation.y = Math.random() * Math.PI * 2;
  donutMesh.rotation.z = Math.random() * Math.PI * 2;
  const scale = Math.random();
  donutMesh.scale.set(scale, scale, scale)
  
  scene.add(donutMesh)

}


gui.add(textMesh.position, 'y').min(-3).max(3).step(0.01).name('Text Y')
gui.add(textMesh.position, 'x').min(-3).max(3).step(0.01).name('Text X')
gui.add(textMesh.position, 'z').min(-3).max(3).step(0.01).name('Text Z')
gui.add(textMesh.rotation, 'y').min(-3).max(3).step(0.01).name('Text Rotation Y')
gui.add(textMesh.rotation, 'x').min(-3).max(3).step(0.01).name('Text Rotation X')
gui.add(textMesh.rotation, 'z').min(-3).max(3).step(0.01).name('Text Rotation Z')


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

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()