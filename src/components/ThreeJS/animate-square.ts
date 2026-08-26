import * as THREE from "three";

const canvas = document.querySelector("canvas.webgl");
if (!(canvas instanceof HTMLCanvasElement)) {
  console.error("Canvas not found");
  throw new Error("ThreeAI: missing canvas.webgl");
}

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, (window as any).innerWidth / (window as any).innerHeight, 0.1, 1000);
camera.position.z = 2.5;

scene.add(camera);

// Create a rotating square
const geometry = new THREE.PlaneGeometry(1, 1);
const material = new THREE.MeshBasicMaterial({ 
  color: 0x00ff88,
  wireframe: true 
});
const square = new THREE.Mesh(geometry, material);
square.rotation.x = Math.PI / 4; // Rotate 45 degrees
scene.add(square);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize((window as any).innerWidth, (window as any).innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));

// Animation loop
function animate(time: number) {
  requestAnimationFrame(animate);
  
  // Rotate the square smoothly
  square.rotation.x = Math.PI / 4 + time * 0.001;
  
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
