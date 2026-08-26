import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("canvas.webgl");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("ThreeAIEye: missing canvas.webgl");
}

const LAYER_SIZES = [5, 9, 13, 9, 5];
const AI_TOKENS = [
  "attention", "embedding", "transformer", "latent", "inference",
  "gradient", "tensor", "context", "reasoning", "token",
];

type NodeRecord = {
  mesh: THREE.Mesh;
  layer: number;
  index: number;
  position: THREE.Vector3;
  activation: number;
};

type Pulse = {
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  progress: number;
  speed: number;
  active: boolean;
};

type TokenParticle = {
  mesh: THREE.Mesh;
  label: THREE.Sprite;
  path: THREE.Vector3[];
  segment: number;
  progress: number;
  active: boolean;
};

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a0a14, 0.0025);
scene.background = new THREE.Color(0x050208);

const sizes = { width: window.innerWidth, height: window.innerHeight };
const camera = new THREE.PerspectiveCamera(55, sizes.width / sizes.height, 0.1, 800);
camera.position.set(0, 20, 190);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.45;
controls.minDistance = 80;
controls.maxDistance = 320;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xf6dce2, 0.35));
const keyLight = new THREE.PointLight(0xfea4a9, 120, 500);
keyLight.position.set(80, 60, 120);
scene.add(keyLight);
const fillLight = new THREE.PointLight(0x471765, 90, 500);
fillLight.position.set(-90, -40, -80);
scene.add(fillLight);

const networkGroup = new THREE.Group();
const eyeGroup = new THREE.Group();
scene.add(networkGroup, eyeGroup);

const nodes: NodeRecord[] = [];
const edges: Array<{ from: NodeRecord; to: NodeRecord; line: THREE.Line }> = [];
const pulses: Pulse[] = [];
const tokens: TokenParticle[] = [];

const pointer = new THREE.Vector2();
const pointerWorld = new THREE.Vector3();
const clock = new THREE.Clock();

let thoughtTimer = 0;
let tokenIndex = 0;
let eyeMorphing: { mesh1: THREE.Mesh; mesh2: THREE.Mesh } | null = null;

function createLatentCore(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec2 uPointer;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.2);
        float ripple = sin(length(vPosition.xy) * 0.08 - uTime * 2.0 + uPointer.x * 3.0) * 0.5 + 0.5;
        vec3 inner = vec3(0.28, 0.09, 0.4);
        vec3 outer = vec3(0.98, 0.64, 0.66);
        vec3 color = mix(inner, outer, fresnel * 0.85 + ripple * 0.25);
        gl_FragColor = vec4(color, fresnel * 0.55 + 0.12);
      }
    `,
  });

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(16, 2), material);
  core.name = "latent-core";
  return core;
}

function createEyes(): void {
  const geometry1 = new THREE.TorusKnotGeometry(14, 4.5, 128, 24);
  const geometry2 = geometry1.clone();

  const material1 = new THREE.MeshStandardMaterial({
    color: 0xf6dce2,
    emissive: 0x471765,
    emissiveIntensity: 0.8,
    roughness: 0.15,
    metalness: 0.35,
    wireframe: true,
  });
  const material2 = new THREE.MeshStandardMaterial({
    color: 0xfea4a9,
    emissive: 0x9c4d6b,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    metalness: 0.35,
    wireframe: true,
  });

  const mesh1 = new THREE.Mesh(geometry1, material1);
  const mesh2 = new THREE.Mesh(geometry2, material2);
  mesh1.position.set(-22, 0, 34);
  mesh2.position.set(22, 0, -34);
  mesh1.rotation.y = Math.PI * 0.15;
  mesh2.rotation.y = -Math.PI * 0.15;

  eyeGroup.add(mesh1, mesh2);
  eyeMorphing = { mesh1, mesh2 };

  for (let i = 0; i < 8; i++) {
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(7 + Math.random() * 2, 1.2, 12, 48),
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xf84d8a : 0xef3f9c,
        transparent: true,
        opacity: 0.35 + Math.random() * 0.25,
      }),
    );
    orbit.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    orbit.position.set(
      (Math.random() - 0.5) * 90,
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 70,
    );
    eyeGroup.add(orbit);
  }
}

function layerRadius(layer: number): number {
  const t = layer / (LAYER_SIZES.length - 1);
  return THREE.MathUtils.lerp(28, 72, t);
}

function createNetwork(): void {
  const core = createLatentCore();
  networkGroup.add(core);

  const nodeGeometry = new THREE.SphereGeometry(1.6, 12, 12);

  LAYER_SIZES.forEach((count, layer) => {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + layer * 0.35;
      const radius = layerRadius(layer);
      const y = (layer - (LAYER_SIZES.length - 1) / 2) * 14 + Math.sin(angle * 2) * 4;
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius * 0.55,
      );

      const material = new THREE.MeshStandardMaterial({
        color: layer === 2 ? 0xfea4a9 : 0xf6dce2,
        emissive: layer === 2 ? 0x9c4d6b : 0x471765,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.55,
      });

      const mesh = new THREE.Mesh(nodeGeometry, material);
      mesh.position.copy(position);
      networkGroup.add(mesh);
      nodes.push({ mesh, layer, index: i, position: position.clone(), activation: 0 });
    }
  });

  for (let layer = 0; layer < LAYER_SIZES.length - 1; layer++) {
    const current = nodes.filter((node) => node.layer === layer);
    const next = nodes.filter((node) => node.layer === layer + 1);

    current.forEach((from) => {
      const connections = [...next]
        .sort(
          (a, b) =>
            from.position.distanceTo(a.position) - from.position.distanceTo(b.position),
        )
        .slice(0, 3);

      connections.forEach((to) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          from.position,
          to.position,
        ]);
        const line = new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: 0xef3f9c,
            transparent: true,
            opacity: 0.08,
          }),
        );
        networkGroup.add(line);
        edges.push({ from, to, line });
      });
    });
  }

  for (let i = 0; i < 36; i++) {
    const pulseMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xfea4a9,
        transparent: true,
        opacity: 0,
      }),
    );
    networkGroup.add(pulseMesh);
    pulses.push({
      mesh: pulseMesh,
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      progress: 0,
      speed: 0.35 + Math.random() * 0.35,
      active: false,
    });
  }
}

function createTextSprite(text: string): THREE.Sprite {
  const size = 256;
  const contextCanvas = document.createElement("canvas");
  contextCanvas.width = size;
  contextCanvas.height = size;
  const ctx = contextCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create token label canvas");
  }

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "rgba(246, 220, 226, 0.95)";
  ctx.font = "600 28px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(contextCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(26, 10, 1);
  return sprite;
}

function spawnToken(): void {
  const word = AI_TOKENS[tokenIndex % AI_TOKENS.length];
  tokenIndex += 1;

  const path: THREE.Vector3[] = [nodes[0]?.position.clone() ?? new THREE.Vector3()];
  for (let layer = 0; layer < LAYER_SIZES.length - 1; layer++) {
    const options = nodes.filter((node) => node.layer === layer + 1);
    if (!options.length) break;
    const previous = path[path.length - 1];
    const next = options.reduce((best, candidate) =>
      previous.distanceTo(candidate.position) < previous.distanceTo(best.position)
        ? candidate
        : best,
    );
    path.push(next.position.clone());
    next.activation = 1;
  }

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 10, 10),
    new THREE.MeshBasicMaterial({
      color: 0xf84d8a,
      transparent: true,
      opacity: 0.95,
    }),
  );
  const label = createTextSprite(word);
  label.position.set(0, 5, 0);
  mesh.add(label);
  mesh.position.copy(path[0]);
  networkGroup.add(mesh);

  tokens.push({
    mesh,
    label,
    path,
    segment: 0,
    progress: 0,
    active: true,
  });

  updateHud(`token :: ${word}`);
}

function firePulse(from: THREE.Vector3, to: THREE.Vector3): void {
  const pulse = pulses.find((entry) => !entry.active);
  if (!pulse) return;
  pulse.active = true;
  pulse.from.copy(from);
  pulse.to.copy(to);
  pulse.progress = 0;
  pulse.mesh.position.copy(from);
  (pulse.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
}

function igniteThoughtPath(): void {
  const path: NodeRecord[] = [];
  for (let layer = 0; layer < LAYER_SIZES.length; layer++) {
    const options = nodes.filter((node) => node.layer === layer);
    if (!options.length) return;
    const pick = options[Math.floor(Math.random() * options.length)];
    path.push(pick);
    pick.activation = 1;
  }

  for (let i = 0; i < path.length - 1; i++) {
    firePulse(path[i].position, path[i + 1].position);
    const edge = edges.find(
      (entry) =>
        (entry.from === path[i] && entry.to === path[i + 1]) ||
        (entry.from === path[i + 1] && entry.to === path[i]),
    );
    if (edge) {
      (edge.line.material as THREE.LineBasicMaterial).opacity = 0.55;
    }
  }

  updateHud("chain-of-thought :: path activated");
}

function updateHud(message: string): void {
  const status = document.querySelector("#ai-status");
  const stream = document.querySelector("#ai-stream");
  if (status) status.textContent = message;
  if (stream) {
    const line = document.createElement("div");
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    stream.prepend(line);
    while (stream.children.length > 6) {
      stream.lastElementChild?.remove();
    }
  }
}

function updatePointer(clientX: number, clientY: number): void {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;

  pointerWorld.set(pointer.x * 70, pointer.y * 40, 0);

  if (eyeMorphing) {
    const targetX = pointer.x * 18;
    const targetY = pointer.y * 10;
    eyeMorphing.mesh1.position.x += (-22 + targetX - eyeMorphing.mesh1.position.x) * 0.08;
    eyeMorphing.mesh1.rotation.y += (targetY * 0.4 - eyeMorphing.mesh1.rotation.y) * 0.08;
    eyeMorphing.mesh2.position.x += (22 - targetX - eyeMorphing.mesh2.position.x) * 0.08;
    eyeMorphing.mesh2.rotation.y += (-targetY * 0.4 - eyeMorphing.mesh2.rotation.y) * 0.08;
  }

  nodes.forEach((node) => {
    const distance = node.position.distanceTo(pointerWorld);
    const influence = THREE.MathUtils.clamp(1 - distance / 55, 0, 1);
    node.activation = Math.max(node.activation, influence);
  });
}

createEyes();
createNetwork();
spawnToken();
updateHud("neural interface online");

window.addEventListener("pointermove", (event) => updatePointer(event.clientX, event.clientY));
window.addEventListener("keydown", (event) => {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.length === 1) spawnToken();
  if (event.key === " ") {
    event.preventDefault();
    igniteThoughtPath();
  }
});

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
});

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  const delta = clock.getDelta();

  thoughtTimer += delta;
  if (thoughtTimer > 4.5) {
    thoughtTimer = 0;
    igniteThoughtPath();
  }

  const core = networkGroup.getObjectByName("latent-core") as THREE.Mesh | undefined;
  if (core) {
    core.rotation.y = elapsed * 0.25;
    core.rotation.x = Math.sin(elapsed * 0.35) * 0.2;
    const uniforms = (core.material as THREE.ShaderMaterial).uniforms;
    uniforms.uTime.value = elapsed;
    uniforms.uPointer.value.set(pointer.x, pointer.y);
  }

  eyeGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.08;
  eyeGroup.children.forEach((child, index) => {
    child.rotation.x += delta * (0.15 + index * 0.01);
    child.rotation.z += delta * 0.08;
  });

  nodes.forEach((node) => {
    node.activation = THREE.MathUtils.lerp(node.activation, 0, delta * 1.6);
    const material = node.mesh.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 0.35 + node.activation * 1.4;
    node.mesh.scale.setScalar(1 + node.activation * 0.35);
  });

  edges.forEach((edge) => {
    const material = edge.line.material as THREE.LineBasicMaterial;
    material.opacity = THREE.MathUtils.lerp(material.opacity, 0.08, delta * 2.5);
  });

  pulses.forEach((pulse) => {
    if (!pulse.active) return;
    pulse.progress += delta * pulse.speed;
    pulse.mesh.position.lerpVectors(pulse.from, pulse.to, pulse.progress);
    const material = pulse.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 1 - pulse.progress;
    if (pulse.progress >= 1) {
      pulse.active = false;
      material.opacity = 0;
    }
  });

  tokens.forEach((token) => {
    if (!token.active || token.path.length < 2) return;
    const start = token.path[token.segment];
    const end = token.path[token.segment + 1];
    if (!start || !end) {
      token.active = false;
      token.mesh.visible = false;
      return;
    }

    token.progress += delta * 0.55;
    token.mesh.position.lerpVectors(start, end, token.progress);
    if (token.progress >= 1) {
      token.segment += 1;
      token.progress = 0;
      if (token.segment >= token.path.length - 1) {
        token.active = false;
        token.mesh.visible = false;
      }
    }
  });

  controls.update();
  renderer.render(scene, camera);
});

export function setCursorPosition(x: number, y: number): void {
  updatePointer(x, y);
}
