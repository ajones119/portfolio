import * as THREE from "three";
import gsap from "gsap";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui';

const gui = new GUI({
  width: 340,
  title: "DEBUG",
  closeFolders: true
});

// cursor
let cursor = {x: 0, y: 0}
window.addEventListener('mousemove', (e) => {
  cursor.x = e.clientX /sizes.width - 0.5;
  cursor.y = -(e.clientY / sizes.height - 0.5);
})

const canvas = document.querySelector("canvas.webgl");
if (!(canvas instanceof HTMLCanvasElement)) {
	console.error("Canvas not found");
	throw new Error("ThreeBasic: missing canvas.webgl");
}

const scene = new THREE.Scene();

const geometry = new THREE.BufferGeometry()

const count = 300;
// count triangles, with 3 vertices, which have 3 points each, hence count *3 *3
const positions = new Float32Array(count * 3 * 3);

for (let i = 0; i < positions.length; i++) {
  positions[i] = (Math.random() - 0.5) * 3;
}

const attribute = new THREE.BufferAttribute(positions, 3);
geometry.setAttribute('position', attribute)

const material = new THREE.MeshBasicMaterial({ color: 'red', wireframe: true });
const boxGeometry = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);

const cube = new THREE.Mesh(
  boxGeometry,
  //geometry,
  material
);

scene.add(cube);

//add debug gui set
gui.add(cube.position, 'y').min(-3).max(3).step(0.01);

const debugProperties = {
  mouseMoveToggle: false,
  cameraLookAtToggle: false,
  subdivision: 2,
  spin: () => {
    // animate the rotation object on cube to spin 1 full rotation
    gsap.to(cube.rotation, { y: cube.rotation.y + Math.PI * 2})
  }
}
gui.add(debugProperties, 'mouseMoveToggle')
gui.add(debugProperties, 'cameraLookAtToggle')
gui.add(cube, 'visible')
gui.add(material, 'wireframe')
gui.addColor(material, 'color').onChange((value: any) => {
  //console.log(value.getHexString(), material.color.getHexString());
  if (value.getHexString() !== material.color.getHexString()) {
    //console.log("DIFFERENT!!")
  }
})

gui.add(debugProperties, 'spin')
gui.add(debugProperties, 'subdivision')
.min(1)
.max(20)
.step(1)
.onFinishChange((value: number) => {
  cube.geometry.dispose()
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1, value, value, value);
  cube.geometry = boxGeometry;
})

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

/*
window.addEventListener('dblclick', () => {
  if (!document.fullscreenElement || false) {
    canvas.requestFullscreen();
  } else {
    document.exitFullscreen()
  }
})*/

const camera = new THREE.PerspectiveCamera(100, sizes.width / sizes.height, 0.001, 999999);
// const camera = new THREE.OrthographicCamera(
//   -1 * aspectRatio,
//   1 * aspectRatio,
//   1,
//   -1,
//   0.1,
//   100);

camera.position.set(0, 0, 3);
camera.lookAt(cube.position)
scene.add(camera)


// renderer
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.render(scene, camera)

let before = Date.now()

// //Animate
// const tick = () => {
//   //console.log("tick")

//   const now = Date.now()
//   const delta = now - before;
//   before = now;

//   const rotateMove = 0.001 * delta;
  
//   // update object
//   cube.rotation.y -= rotateMove
  
//   renderer.render(scene, camera)
//   requestAnimationFrame(tick)
// }

// 1. instantiate timer
const timer = new THREE.Timer();
timer.connect(document)

// gsap.to(cube.position, { 
//   x: 2,
//   duration: 1,
//   delay: 1
// })
// gsap.to(cube.position, { 
//   x: 0,
//   duration: 1,
//   delay: 2
// })
// 2. Setup your render loop using setAnimationLoop
renderer.setAnimationLoop(() => {
    
  // 3. Update the timer at the start of every frame
  timer.update();

  // 4. Get the elapsed time & delta time
  const elapsed = timer.getElapsed();  // Total time since initialization
  const delta = timer.getDelta();

  // Example: Rotate an object at a constant speed
  // cube.rotation.y += delta * Math.PI * 0.5; 
  // camera.position.y = Math.sin(elapsed)
  // camera.position.x = Math.cos(elapsed)

  // camera.lookAt(cube.position);

  //update camera

  if (debugProperties.mouseMoveToggle) {
    camera.position.x = Math.sin(cursor.x * Math.PI*2) * -3;
    camera.position.z = Math.cos(cursor.x *  Math.PI*2) * 3;
    camera.position.y = cursor.y * 3
  }
  if (debugProperties.cameraLookAtToggle) {
    camera.lookAt(cube.position)
  }


  renderer.render(scene, camera);
});

renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))

renderer.render(scene, camera);



// timer.connect(document)

// //Animate
// const tick = () => {
//   timer.update();

//   //console.log("tick")
//   // Timer
//   const elapsed = timer.getDelta();
//   console.log(elapsed)

//   const now = Date.now()
//   const delta = now - before;
//   before = now;

//   const rotateMove = 0.001 * delta;
  
//   // update object
//   cube.rotation.y -= rotateMove
  
//   renderer.render(scene, camera)
//   requestAnimationFrame(tick)
// }

// tick();