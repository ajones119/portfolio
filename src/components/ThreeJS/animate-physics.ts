import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import Cannon from 'cannon'
import HitSound from '../../assets/sounds/hit.mp3'

const hitSound = new Audio(HitSound);


const playHitSound = (collision: any) => {
    const impactStrength = collision.contact.getImpactVelocityAlongNormal();
    if (impactStrength > 1.5) {
        hitSound.currentTime = 0;
        hitSound.volume = Math.random() * 0.3 + 0.1;
        hitSound.play();
    }
}
/**
 * Debug
 */
const gui = new GUI();

const sphereFolder = gui.addFolder('Sphere');
const sphereCreateDebug = {
    radius: 0.5,
    x: 0,
    y: 3,
    z: 0,
    create: () => {
        createSphere(sphereCreateDebug.radius, new THREE.Vector3(sphereCreateDebug.x, sphereCreateDebug.y, sphereCreateDebug.z));
    },
    createRandom: () => {
    createSphere(Math.random() * 0.5 + 0.1, new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 6 + 3, Math.random() * 6 - 3));
    }
};
sphereFolder.add(sphereCreateDebug, 'radius').min(0.1).max(1).step(0.01).name('Radius');
sphereFolder.add(sphereCreateDebug, 'x').min(-3).max(3).step(0.01).name('X');
sphereFolder.add(sphereCreateDebug, 'y').min(0).max(6).step(0.01).name('Y');
sphereFolder.add(sphereCreateDebug, 'z').min(-3).max(3).step(0.01).name('Z');
sphereFolder.add(sphereCreateDebug, 'create').name('Create Sphere');
sphereFolder.add(sphereCreateDebug, 'createRandom').name('Create Random Sphere');

const boxFolder = gui.addFolder('Box');
const boxCreateDebug = {
    size: new THREE.Vector3(1, 1, 1),
    x: 0,
    y: 3,
    z: 0,
    create: () => {
        createBox(boxCreateDebug.size, new THREE.Vector3(boxCreateDebug.x, boxCreateDebug.y, boxCreateDebug.z));
    },
    createRandom: () => {
        createBox(new THREE.Vector3(Math.random() * 2 + 0.5, Math.random() * 2 + 0.5, Math.random() * 2 + 0.5), new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 6 + 3, Math.random() * 6 - 3));
    }
};
boxFolder.add(boxCreateDebug, 'createRandom').name('Create Random Box');


/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()


const world = new Cannon.World();
//performance optimization
world.broadphase = new Cannon.SAPBroadphase(world);
world.allowSleep = true;
world.gravity.set(0, -9.82, 0);

// Materials
const concreteMaterial = new Cannon.Material('concrete');

const plasticMaterial = new Cannon.Material('plastic');

const contactMaterial = new Cannon.ContactMaterial(concreteMaterial, plasticMaterial, {
    friction: 0.1,
    restitution: 0.8
});

world.addContactMaterial(contactMaterial);


/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])


/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

const floorShape = new Cannon.Plane();
const floorBody = new Cannon.Body({
   // mass: 0,
   //position: new Cannon.Vec3(0, 0, 0),
    shape: floorShape,
    material: concreteMaterial
})
floorBody.quaternion.setFromAxisAngle(new Cannon.Vec3(-1, 0, 0), Math.PI * 0.5);
world.addBody(floorBody);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
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
camera.position.set(- 3, 3, 3)
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
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const bodiesToUpdate: any[] = [];

const createSphere = (radius: number, position: THREE.Vector3) => {
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 32),
        new THREE.MeshStandardMaterial({
            metalness: 0.3,
            roughness: 0.4,
            envMap: environmentMapTexture,
        })
    );
    mesh.castShadow = true;
    mesh.position.copy(position);
    scene.add(mesh);

    const shape = new Cannon.Sphere(radius);
    const body = new Cannon.Body({
        mass: 1,
        position: new Cannon.Vec3(position.x, position.y, position.z),
        shape: shape,
        material: plasticMaterial
    });

    world.addBody(body);

    const updateTick = () => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
    };

    bodiesToUpdate.push({ mesh, body, updateTick });
""
    return { mesh, body };
}

//createSphere(0.5, new THREE.Vector3(0, 3, 0));


const boxMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
});

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

const createBox = (size: THREE.Vector3, position: THREE.Vector3) => {
    const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
    mesh.position.copy(position);
    mesh.scale.copy(size);
    scene.add(mesh);

    const shape = new Cannon.Box(new Cannon.Vec3(size.x/2, size.y/2, size.z/2));
    const body = new Cannon.Body({
        mass: 1,
        position: new Cannon.Vec3(position.x, position.y, position.z),
        shape: shape,
        material: plasticMaterial
    })


    body.addEventListener('collide', (collision) => {
        playHitSound(collision);
    });
    world.addBody(body);
    
    const updateTick = () => {
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
    };
    
    bodiesToUpdate.push({ mesh, body, updateTick });
    return { mesh, body };
}

/**
 * Animate
 */
const clock = new THREE.Clock()
let oldElapsedTime = 0;
const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const delta = elapsedTime - oldElapsedTime;
    oldElapsedTime = elapsedTime;

    //update physics
    bodiesToUpdate.forEach(body => body.updateTick());
    
    world.step(1/60, delta, 3);

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()