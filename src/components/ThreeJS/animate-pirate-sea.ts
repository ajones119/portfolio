import * as THREE from "three";

const canvas = document.querySelector("canvas.pirate-sea-canvas");
if (!(canvas instanceof HTMLCanvasElement)) {
	throw new Error("PirateSea: missing canvas.pirate-sea-canvas");
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function getThemeColors() {
	const dark = document.documentElement.getAttribute("data-theme") === "dark";
	return {
		deep: dark ? "#061018" : "#1a3d4d",
		surface: dark ? "#2a6a7a" : "#336666",
		fog: dark ? "#0a0a0a" : "#f8f6f2",
		moon: dark ? "#e8c87a" : "#f0d080",
		sky: dark ? "#0a0a0a" : "#f8f6f2",
	};
}

let colors = getThemeColors();

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(colors.fog, 12, 55);

const sizes = { width: window.innerWidth, height: window.innerHeight };
const camera = new THREE.PerspectiveCamera(42, sizes.width / sizes.height, 0.1, 100);
camera.position.set(6, 5, 14);
camera.lookAt(-2, 0, 0);

const renderer = new THREE.WebGLRenderer({
	canvas,
	antialias: true,
	alpha: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const pointer = { x: 0, y: 0 };
const clock = new THREE.Clock();

// --- Ocean shader ---
const waterUniforms = {
	uTime: { value: 0 },
	uDeepColor: { value: new THREE.Color(colors.deep) },
	uSurfaceColor: { value: new THREE.Color(colors.surface) },
	uMouse: { value: new THREE.Vector2(0, 0) },
};

const waterMaterial = new THREE.ShaderMaterial({
	transparent: true,
	uniforms: waterUniforms,
	vertexShader: `
		uniform float uTime;
		uniform vec2 uMouse;
		varying float vElevation;
		varying vec2 vUv;

		void main() {
			vUv = uv;
			vec4 modelPosition = modelMatrix * vec4(position, 1.0);
			float wave1 = sin(modelPosition.x * 0.55 + uTime * 1.1) * 0.35;
			float wave2 = sin(modelPosition.z * 0.4 + uTime * 0.85) * 0.28;
			float wave3 = sin((modelPosition.x + modelPosition.z) * 0.25 + uTime * 0.6 + uMouse.x * 2.0) * 0.15;
			float elevation = wave1 + wave2 + wave3;
			modelPosition.y += elevation;
			vElevation = elevation;
			gl_Position = projectionMatrix * viewMatrix * modelPosition;
		}
	`,
	fragmentShader: `
		uniform vec3 uDeepColor;
		uniform vec3 uSurfaceColor;
		varying float vElevation;
		varying vec2 vUv;

		void main() {
			float foam = smoothstep(0.15, 0.45, vElevation);
			vec3 color = mix(uDeepColor, uSurfaceColor, foam);
			float shimmer = sin(vUv.x * 80.0 + vUv.y * 60.0) * 0.03 + 0.97;
			gl_FragColor = vec4(color * shimmer, 0.72);
		}
	`,
});

const water = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 128, 128), waterMaterial);
water.rotation.x = -Math.PI * 0.5;
water.position.y = -1.2;
scene.add(water);

// --- Moon ---
const moon = new THREE.Mesh(
	new THREE.SphereGeometry(1.8, 32, 32),
	new THREE.MeshBasicMaterial({ color: colors.moon })
);
moon.position.set(-14, 10, -18);
scene.add(moon);

const moonGlow = new THREE.Mesh(
	new THREE.SphereGeometry(2.8, 16, 16),
	new THREE.MeshBasicMaterial({
		color: colors.moon,
		transparent: true,
		opacity: 0.12,
	})
);
moonGlow.position.copy(moon.position);
scene.add(moonGlow);

// --- Stars ---
const starCount = 120;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
	starPositions[i * 3] = (Math.random() - 0.5) * 60;
	starPositions[i * 3 + 1] = 4 + Math.random() * 20;
	starPositions[i * 3 + 2] = -15 - Math.random() * 25;
}
const stars = new THREE.Points(
	new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(starPositions, 3)),
	new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7 })
);
scene.add(stars);

// --- Ship ---
const ship = new THREE.Group();

const hullMat = new THREE.MeshStandardMaterial({ color: "#4a2c1a", roughness: 0.85 });
const woodMat = new THREE.MeshStandardMaterial({ color: "#6b4423", roughness: 0.75 });
const sailMat = new THREE.MeshStandardMaterial({
	color: "#e8dcc4",
	roughness: 0.9,
	side: THREE.DoubleSide,
});
const flagMat = new THREE.MeshStandardMaterial({
	color: "#ff9966",
	roughness: 0.7,
	side: THREE.DoubleSide,
});

const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.2), hullMat);
hull.position.y = 0.1;
ship.add(hull);

const bow = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 4), hullMat);
bow.rotation.z = Math.PI * 0.5;
bow.rotation.y = Math.PI * 0.25;
bow.position.set(2.0, 0.35, 0);
ship.add(bow);

const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.5, 8), woodMat);
mast.position.set(-0.3, 2.4, 0);
ship.add(mast);

const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), sailMat);
sail.position.set(0.5, 2.8, 0);
ship.add(sail);

const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), flagMat);
flag.position.set(-0.3, 4.8, 0.05);
ship.add(flag);

// Skull on flag — canvas texture
const skullCanvas = document.createElement("canvas");
skullCanvas.width = 64;
skullCanvas.height = 64;
const ctx = skullCanvas.getContext("2d");
if (ctx) {
	ctx.fillStyle = "#1a1208";
	ctx.font = "bold 40px serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("☠", 32, 34);
}
const skullTex = new THREE.CanvasTexture(skullCanvas);
const skullFlag = new THREE.Mesh(
	new THREE.PlaneGeometry(0.45, 0.45),
	new THREE.MeshBasicMaterial({ map: skullTex, transparent: true })
);
skullFlag.position.set(-0.3, 4.8, 0.12);
ship.add(skullFlag);

const cannonL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), woodMat);
cannonL.rotation.z = Math.PI * 0.5;
cannonL.position.set(0.8, 0.35, 0.55);
ship.add(cannonL);

const cannonR = cannonL.clone();
cannonR.position.z = -0.55;
ship.add(cannonR);

ship.position.set(-3, 0, 0);
scene.add(ship);

// --- Treasure coins ---
const coins: THREE.Mesh[] = [];
const coinGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16);
const coinMat = new THREE.MeshStandardMaterial({
	color: "#c9a227",
	metalness: 0.9,
	roughness: 0.25,
});

for (let i = 0; i < 14; i++) {
	const coin = new THREE.Mesh(coinGeo, coinMat);
	coin.position.set(
		(Math.random() - 0.5) * 18,
		-0.85,
		(Math.random() - 0.5) * 12
	);
	coin.userData = {
		phase: Math.random() * Math.PI * 2,
		speed: 0.4 + Math.random() * 0.6,
		spin: (Math.random() - 0.5) * 2,
	};
	coins.push(coin);
	scene.add(coin);
}

// --- Lantern particles (fireflies over water) ---
const flyCount = 40;
const flyPositions = new Float32Array(flyCount * 3);
for (let i = 0; i < flyCount; i++) {
	flyPositions[i * 3] = (Math.random() - 0.5) * 20;
	flyPositions[i * 3 + 1] = -0.5 + Math.random() * 3;
	flyPositions[i * 3 + 2] = (Math.random() - 0.5) * 14;
}
const fireflies = new THREE.Points(
	new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(flyPositions, 3)),
	new THREE.PointsMaterial({
		color: 0xffcc66,
		size: 0.12,
		transparent: true,
		opacity: 0.8,
		blending: THREE.AdditiveBlending,
	})
);
scene.add(fireflies);

// --- Lights ---
scene.add(new THREE.AmbientLight(0x4466aa, 0.45));
const moonLight = new THREE.PointLight(0xffddaa, 18, 50);
moonLight.position.copy(moon.position);
scene.add(moonLight);

const lantern = new THREE.PointLight(0xff9933, 4, 8);
lantern.position.set(-3, 1.5, 0.5);
ship.add(lantern);

function updateTheme() {
	colors = getThemeColors();
	const dark = document.documentElement.getAttribute("data-theme") === "dark";
	scene.fog = new THREE.Fog(colors.fog, 12, 55);
	waterUniforms.uDeepColor.value.set(colors.deep);
	waterUniforms.uSurfaceColor.value.set(colors.surface);
	moon.material = new THREE.MeshBasicMaterial({ color: colors.moon });
	moonGlow.material = new THREE.MeshBasicMaterial({
		color: colors.moon,
		transparent: true,
		opacity: dark ? 0.12 : 0.2,
	});
	(stars.material as THREE.PointsMaterial).opacity = dark ? 0.7 : 0.15;
	moon.visible = dark;
	moonGlow.visible = dark;
}

const themeObserver = new MutationObserver(updateTheme);
themeObserver.observe(document.documentElement, {
	attributes: true,
	attributeFilter: ["data-theme"],
});
updateTheme();

window.addEventListener("mousemove", (e) => {
	pointer.x = (e.clientX / sizes.width - 0.5) * 2;
	pointer.y = (e.clientY / sizes.height - 0.5) * 2;
	waterUniforms.uMouse.value.set(pointer.x, pointer.y);
});

window.addEventListener("resize", () => {
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();
	renderer.setSize(sizes.width, sizes.height);
});

let animationId = 0;

function animate() {
	const elapsed = clock.getElapsedTime();
	const t = prefersReducedMotion ? 0 : elapsed;

	waterUniforms.uTime.value = t;

	// Ship bob & rock
	const bob = Math.sin(t * 1.2) * 0.12 + Math.sin(t * 0.7) * 0.06;
	const rock = Math.sin(t * 0.9) * 0.04 + pointer.x * 0.02;
	ship.position.y = bob;
	ship.rotation.z = rock;
	ship.rotation.x = Math.sin(t * 0.6) * 0.03;

	sail.rotation.y = Math.sin(t * 1.4) * 0.15 + pointer.x * 0.05;
	flag.rotation.y = Math.sin(t * 2.0) * 0.25;
	skullFlag.rotation.y = flag.rotation.y;

	// Coins
	for (const coin of coins) {
		const d = coin.userData as { phase: number; speed: number; spin: number };
		coin.position.y = -0.85 + Math.sin(t * d.speed + d.phase) * 0.15;
		coin.rotation.y += prefersReducedMotion ? 0 : 0.02 * d.spin;
	}

	// Fireflies drift
	const flyAttr = fireflies.geometry.getAttribute("position") as THREE.BufferAttribute;
	for (let i = 0; i < flyCount; i++) {
		flyAttr.setY(i, -0.5 + Math.sin(t * 0.5 + i) * 1.5 + Math.cos(t * 0.3 + i * 2) * 0.5);
	}
	flyAttr.needsUpdate = true;

	// Camera parallax
	camera.position.x = 6 + pointer.x * 0.8;
	camera.position.y = 5 + pointer.y * 0.4;
	camera.lookAt(-2 + pointer.x * 0.3, 0, 0);

	renderer.render(scene, camera);
	animationId = requestAnimationFrame(animate);
}

animate();

document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		cancelAnimationFrame(animationId);
	} else {
		animate();
	}
});
