import * as THREE from "three";
import gsap from "gsap";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui';

import matcap1 from "../../assets/images/demoImages/threejs/textures/matcaps/1.png"
import gradient3 from "../../assets/images/demoImages/threejs/textures/gradients/3.jpg"
import gradient5 from "../../assets/images/demoImages/threejs/textures/gradients/5.jpg"

import DoorAlpha from "../../assets/images/demoImages/threejs/textures/door/alpha.jpg"
import DoorAmbient from "../../assets/images/demoImages/threejs/textures/door/ambientOcclusion.jpg"
import DoorNormal from  "../../assets/images/demoImages/threejs/textures/door/normal.jpg"
import DoorColor from  "../../assets/images/demoImages/threejs/textures/door/color.jpg"
import DoorHeight from  "../../assets/images/demoImages/threejs/textures/door/height.jpg"
import DoorMetalness from  "../../assets/images/demoImages/threejs/textures/door/metalness.jpg"
import DoorRoughness from  "../../assets/images/demoImages/threejs/textures/door/roughness.jpg"

import envMap from "../../assets/images/demoImages/threejs/textures/environmentMap/2k.hdr";

import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const gui = new GUI({
  width: 340,
  title: "DEBUG",
  closeFolders: true
});

const canvas = document.querySelector("canvas.webgl");
if (!(canvas instanceof HTMLCanvasElement)) {
	console.error("Canvas not found");
	throw new Error("ThreeBasic: missing canvas.webgl");
}

const scene = new THREE.Scene();

let sizes = {
  width: window.innerWidth, height: window.innerHeight 
}


window.addEventListener('resize', () => {
  sizes = {
    width: window.innerWidth, height: window.innerHeight 
  }
  const aspectRatio = sizes.width / sizes.height;

  camera.aspect = aspectRatio;
  camera.updateProjectionMatrix()

  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))

})
// TEXTURES
const loader = new THREE.TextureLoader();
const matcap = loader.load(matcap1.src);
const gradient = loader.load(gradient3.src);
const gradient2 = loader.load(gradient5.src);

const alphaDoor = loader.load(DoorAlpha.src)
const colorDoor = loader.load(DoorColor.src)
const metalnessDoor = loader.load(DoorMetalness.src)
const ambientDoor = loader.load(DoorAmbient.src)
const roughnessDoor = loader.load(DoorRoughness.src)
const normalDoor = loader.load(DoorNormal.src)
const heightDoor = loader.load(DoorHeight.src)

// color space
matcap.colorSpace = THREE.SRGBColorSpace;
colorDoor.colorSpace = THREE.SRGBColorSpace;

// OBJECTS
const sphereGeometry = new THREE.SphereGeometry(0.5, 64, 64);
const planeGeometry = new THREE.PlaneGeometry(1, 1, 32, 32);
const torusGeometry = new THREE.TorusGeometry(0.3, 0.2, 64, 128);

// const material = new THREE.MeshBasicMaterial({
//   map: colorDoor,
//   //color: 'green'
//   //wireframe: true
// });
// const color = new THREE.Color('skyblue');
// material.color = color;
//  material.transparent = true;
// // material.opacity = 0.9;
// material.alphaMap = alphaDoor;

// needs more processing to do double side
// material.side = THREE.DoubleSide

// // meshNormalMaterial
// const material = new THREE.MeshNormalMaterial();
// material.side = THREE.DoubleSide;
// material.flatShading = true;

// meshMatcapMaterial - no light in the scene, creates illusion of light
// const material = new THREE.MeshMatcapMaterial();
// material.side = THREE.DoubleSide;

// mesh depth material
// const material = new THREE.MeshDepthMaterial();
// material.side = THREE.DoubleSide;

// const ambientLight = new THREE.AmbientLight('white', 1)
// const pointLight = new THREE.PointLight('white', 30);
// pointLight.position.x = 2;
// pointLight.position.y = 3;
// pointLight.position.z = 4;
// scene.add(ambientLight, pointLight);

// mesh lambert material - requires lights
// const material = new THREE.MeshLambertMaterial();
// material.side = THREE.DoubleSide;

// mesh phong material
// const material = new THREE.MeshPhongMaterial()
// material.shininess = 100;
// material.specular = new THREE.Color('blue');

// // mesh toon material
// const material = new THREE.MeshToonMaterial();
// // texture sos small, we need to disable mipmapping
// gradient.minFilter = THREE.NearestFilter;
// gradient.magFilter = THREE.NearestFilter;
// material.gradientMap = gradient;

// mesh standard material
const material = new THREE.MeshPhysicalMaterial()
  // material.metalness = 0.7;
  // material.roughness = 0.2;

material.map = colorDoor;
material.normalMap = normalDoor;
material.roughnessMap = roughnessDoor;
material.metalnessMap = metalnessDoor;
material.aoMap = ambientDoor;
material.alphaMap = alphaDoor;
material.transparent = true;
material.side = THREE.DoubleSide;

material.displacementMap = heightDoor;
material.displacementScale = 0.1;
//material.displacementBias = 0.01;
gui.add(material, 'metalness').min(0).max(1).step(0.05)
gui.add(material, 'roughness').min(0).max(1).step(0.05)

// // Clearcoat
// material.clearcoat = 1;
// material.clearcoatRoughness = 0.1;

// gui.add(material, 'clearcoat').min(0).max(1).step(0.05)
// gui.add(material, 'clearcoatRoughness').min(0).max(1).step(0.05)

// // Sheen
// material.sheen = 1;
// material.sheenRoughness = 0.1;
// gui.add(material, 'sheen').min(0).max(1).step(0.05)
// gui.add(material, 'sheenRoughness').min(0).max(1).step(0.05)
// gui.addColor(material, 'sheenColor')

// iradecence
material.ior = 1.5;
gui.add(material, 'ior').min(1).max(2).step(0.05)

// Transmission
material.transmission = 1;
material.thickness = 0.5;
gui.add(material, 'transmission').min(0).max(1).step(0.05)
gui.add(material, 'thickness').min(0).max(1).step(0.05)

const sphereMesh = new THREE.Mesh(sphereGeometry, material);
const planeMesh = new THREE.Mesh(planeGeometry, material)
const torusMesh = new THREE.Mesh(torusGeometry, material);

scene.add(sphereMesh, planeMesh, torusMesh);

gsap.to(sphereMesh.position, {x: -1.5})
gsap.to(torusMesh.position, {x: 1.5})

const hdrLoader = new HDRLoader();


hdrLoader.load(envMap, (environmentMap) => {
  environmentMap.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = environmentMap;
  scene.background = environmentMap;
});


const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
// camera position so important!!!
camera.position.x = 1
camera.position.y = 1
camera.position.z = 2
scene.add(camera)


// renderer
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.render(scene, camera)

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

let before = Date.now()



// 1. instantiate timer
const timer = new THREE.Timer();
timer.connect(document)

renderer.setAnimationLoop(() => {
    
  timer.update();

  const elapsed = timer.getElapsed();  // Total time since initialization
  const delta = timer.getDelta();

  // update objects
  sphereMesh.rotation.y = 0.1 * elapsed;
  planeMesh.rotation.y = 0.1 * elapsed;
  torusMesh.rotation.y = 0.1 * elapsed;

  sphereMesh.rotation.x = 0.15 * elapsed;
  planeMesh.rotation.x = 0.15 * elapsed;
  torusMesh.rotation.x = 0.15 * elapsed;


  controls.update();
  renderer.render(scene, camera);
});

renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))

renderer.render(scene, camera);
