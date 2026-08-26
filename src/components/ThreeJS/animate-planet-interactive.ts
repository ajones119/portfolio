import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import GUI from 'lil-gui'
import gsap from 'gsap'

import MarbleRockDiff from '../../assets/images/demoImages/threejs/textures/marble_rock_03_4k.blend/textures/marble_rock_03_diff_4k.jpg'
import MarbleRockDisp from '../../assets/images/demoImages/threejs/textures/marble_rock_03_4k.blend/textures/marble_rock_03_disp_4k.png'
import MarbleRockNor from '../../assets/images/demoImages/threejs/textures/marble_rock_03_4k.blend/textures/marble_rock_03_nor_gl_4k.exr'
import MarbleRockRough from '../../assets/images/demoImages/threejs/textures/marble_rock_03_4k.blend/textures/marble_rock_03_rough_4k.exr'


type MarbleTextures = {
    //diff: THREE.Texture
    disp: THREE.Texture
    nor: THREE.Texture
    rough: THREE.Texture
}

let marbleTextures: MarbleTextures
let sceneInfos: PlanetSceneInfo[] = []

const loadingManager = new THREE.LoadingManager()
const textureLoader = new THREE.TextureLoader(loadingManager)
const exrLoader = new EXRLoader(loadingManager)

type PlanetSceneInfo = {
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    elem: HTMLElement
    planet: THREE.Mesh
    ambientLight: THREE.AmbientLight
    directionalLight: THREE.DirectionalLight
    isActive: boolean
}

const gui = new GUI()

const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement
const planetElems = document.querySelectorAll('.planet-view') as NodeListOf<HTMLElement>

const lightSettings = {
    ambientIntensity: 1.2,
    directionalIntensity: 1.5,
}

gui.add(lightSettings, 'ambientIntensity').min(0).max(10).step(0.1).name('ambientLight').onChange(() => {
    for (const info of sceneInfos) {
        info.ambientLight.intensity = lightSettings.ambientIntensity
    }
})
gui.add(lightSettings, 'directionalIntensity').min(0).max(10).step(0.1).name('directionalLight').onChange(() => {
    for (const info of sceneInfos) {
        info.directionalLight.intensity = lightSettings.directionalIntensity
    }
})

function addLights(scene: THREE.Scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, lightSettings.ambientIntensity)
    const directionalLight = new THREE.DirectionalLight(0xffffff, lightSettings.directionalIntensity)
    directionalLight.position.set(3, 4, 2)

    scene.add(ambientLight, directionalLight)

    return { ambientLight, directionalLight }
}

const textureSettings = {
  displacementScale: 0.04,
  metalness: 0.1,
  roughness: 0.5,
}
gui.add(textureSettings, 'displacementScale').min(0).max(2).step(0.01).name('displacementScale').onChange(() => {
    for (const info of sceneInfos) {
        if (info.planet.material instanceof THREE.MeshStandardMaterial) {
            info.planet.material.displacementScale = textureSettings.displacementScale
        }
    }
})
gui.add(textureSettings, 'metalness').min(0).max(1).step(0.01).name('metalness').onChange(() => {
    for (const info of sceneInfos) {
        info.planet.material.metalness = textureSettings.metalness
    }
})

gui.add(textureSettings, 'roughness').min(0).max(1).step(0.01).name('roughness').onChange(() => {
    for (const info of sceneInfos) {
        if (info.planet.material instanceof THREE.MeshStandardMaterial) {
            info.planet.material.roughness = textureSettings.roughness
        }
    }
})

function makePlanetMaterial(color: string, wireframe: boolean, radius: number) {
    return new THREE.MeshStandardMaterial({
        color,
        wireframe,
        //map: marbleTextures.diff,
        displacementMap: marbleTextures.disp,
        normalMap: marbleTextures.nor,
        roughnessMap: marbleTextures.rough,
        displacementScale: radius * 0.04,
        metalness: 0.1,
    })
}

function makePlanetScene(elem: HTMLElement): PlanetSceneInfo {
  const id = elem.id
    const color = elem.dataset.color ?? '#ffffff'
    const radius = parseFloat(elem.dataset.radius ?? '1')
    const cameraRadius = parseFloat(elem.dataset.cameraRadius ?? '4')
    const wireframe = elem.dataset.wireframe === 'true'

    const scene = new THREE.Scene()
    const { ambientLight, directionalLight } = addLights(scene)

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100)
    camera.position.set(0, 0, cameraRadius)
    scene.add(camera)

    const controls = new OrbitControls(camera, elem)
    controls.enableDamping = true
    controls.enableZoom = false
    controls.enablePan = false

    const planet = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 128, 128),
        makePlanetMaterial(color, wireframe, radius)
    )
    scene.add(planet)

    const sceneInfo = { scene, camera, controls, elem, planet, ambientLight, directionalLight, isActive: false }

    elem.addEventListener('click', () => {
        for (const info of sceneInfos) {
            info.isActive = false
        }
        sceneInfo.isActive = true
    })

    const folder = gui.addFolder(id);
    const planetParams = { radius }

    folder.addColor(sceneInfo.planet.material, 'color')
    folder.add(sceneInfo.planet.material, 'wireframe')
    folder.add(sceneInfo.planet.material, 'roughness').min(0).max(1).step(0.01)
    folder.add(sceneInfo.planet.material, 'metalness').min(0).max(1).step(0.01)
    folder.add(sceneInfo.planet.material, 'displacementScale').min(0).max(2).step(0.01)
    folder.add(planetParams, 'radius', 0, 10, 0.01).onChange(() => {
        planet.geometry.dispose()
        planet.geometry = new THREE.SphereGeometry(planetParams.radius, 128, 128)
    })
    return sceneInfo
}

loadingManager.onLoad = () => {
  console.log("LOADED")
  sceneInfos = Array.from(planetElems).map((elem) => makePlanetScene(elem))
  registerClickListeners()
}

// const marbleRockDiff = textureLoader.load(MarbleRockDiff.src)
// marbleRockDiff.colorSpace = THREE.SRGBColorSpace

const marbleRockDisp = textureLoader.load(MarbleRockDisp.src)

const marbleRockNor = exrLoader.load(MarbleRockNor)
marbleRockNor.flipY = false

const marbleRockRough = exrLoader.load(MarbleRockRough)

marbleTextures = {
    //diff: marbleRockDiff,
    disp: marbleRockDisp,
    nor: marbleRockNor,
    rough: marbleRockRough,
}

const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

function resizeRendererToDisplaySize() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needResize = canvas.width !== width || canvas.height !== height

    if (needResize) {
        renderer.setSize(width, height, false)
    }

    return needResize
}

window.addEventListener('resize', resizeRendererToDisplaySize)
resizeRendererToDisplaySize()

function renderSceneInfo(sceneInfo: PlanetSceneInfo, {delta, elapsed}: {delta: number, elapsed: number}) {
    const { scene, camera, elem, planet } = sceneInfo
    const canvasRect = renderer.domElement.getBoundingClientRect()
    const elemRect = elem.getBoundingClientRect()

    const width = elemRect.width
    const height = elemRect.height
    const left = elemRect.left - canvasRect.left
    const bottom = canvasRect.bottom - elemRect.bottom

    const isOffscreen =
        elemRect.bottom < canvasRect.top ||
        elemRect.top > canvasRect.bottom ||
        elemRect.right < canvasRect.left ||
        elemRect.left > canvasRect.right

    if (isOffscreen || width <= 0 || height <= 0) {
        return
    }

    //rotate planet
    planet.rotation.x += parseFloat(elem.dataset.rotationX ?? '0') * delta
    planet.rotation.z += parseFloat(elem.dataset.rotationZ ?? '0') * delta
    planet.rotation.y += parseFloat(elem.dataset.rotationY ?? '0') * delta

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    renderer.setScissor(left, bottom, width, height)
    renderer.setViewport(left, bottom, width, height)

    sceneInfo.controls.update()
    renderer.render(scene, camera)
}

const timer = new THREE.Timer();
timer.connect(document)

renderer.setAnimationLoop(() => {

  const elapsed = timer.getElapsed();
  const delta = timer.getDelta();

    renderer.setScissorTest(false)
    renderer.clear(true, true)
    renderer.setScissorTest(true)
    timer.update()
    for (const sceneInfo of sceneInfos) {
        renderSceneInfo(sceneInfo, {delta, elapsed})
    }
})

const registerClickListeners = () => {
  for (const sceneInfo of sceneInfos) {
    sceneInfo.elem.addEventListener('click', () => {
      gsap.to(sceneInfo.planet.rotation, {
        y: sceneInfo.planet.rotation.y + Math.PI * 2,
        duration: 2,
        ease: 'power2.inOut',
      })
    })
  }
}
