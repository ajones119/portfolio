import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export function animateAI(scene: THREE.Scene) {
  const controls = new OrbitControls()
  scene.controls = controls
  return () => {
    controls?.update()
    scene.traverse((o: THREE.Object3D) => o.render())
  }
}