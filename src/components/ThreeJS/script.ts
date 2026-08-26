import * as THREE from 'three';

//canvas
const canvas = document.querySelector("canvas.webgl");
if (!(canvas instanceof HTMLCanvasElement)) {
	console.error("Canvas not found");
	throw new Error("ThreeBasic: missing canvas.webgl");
}

console.log("Canvas found");

// Scene
const scene = new THREE.Scene();

/* Group */
const group = new THREE.Group();
scene.add(group);

const cube1 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: "#ff0000" })
);
group.add(cube1)


const cube2 = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.5, 0.5),
  new THREE.MeshBasicMaterial({ color: "#00ff00f" })
);

cube2.position.x = -2;

group.add(cube2)

const cube3 = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 1.5, 1.5),
  new THREE.MeshBasicMaterial({ color: "#0000ff" })
);

cube3.position.x = 2;

group.add(cube3);

//group.scale.y = 2;
//group.rotation.x = 2;

// geometry - (w, h, d), red, 
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0xff0000  });
const mesh = new THREE.Mesh(geometry, material);

mesh.position.x = 2;
mesh.position.y = -0.5;
mesh.position.z = 0.5;

mesh.position.set(1.5, -0.8, -1.5);

//axes helper
const axesHelper = new THREE.AxesHelper();
scene.add(axesHelper);

scene.add(mesh);

//distance from center of scene to mesh
console.log(mesh.position.length());
console.log(mesh.position.distanceTo(new THREE.Vector3(0, 1, 2)));
//mesh.position.normalize();
console.log(mesh.position.length());

//scale
mesh.scale.set(2, 0.5, 0.5);

//rotation, full rotation is 2*PI, so 8 * Math.PI / 4 is 4 full rotations
// rotations get applied in xyz order, but can be reordered with .reorder()
mesh.rotation.y = 2 * Math.PI / 4;
mesh.rotation.x = 3 * Math.PI / 4;
mesh.rotation.z = 4 * Math.PI / 4;
mesh.rotation.reorder('YXZ');


// camera
const sizes = {
  width: 800,
  height: 600
}
const camera = new THREE.PerspectiveCamera(100, sizes.width / sizes.height);
camera.position.set(1, 1, 3);
scene.add(camera);
//camera.lookAt(mesh.position);
console.log(mesh.position.distanceTo(camera.position));


// renderer
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.render(scene, camera);