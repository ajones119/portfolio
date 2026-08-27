import { AmbientLight, BackSide, BoxGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, TorusGeometry, type Object3D, type Scene } from 'three';
import NetworkPlayers from './NetworkPlayers';

const GREYBOX_RINGS = [
  { x: 0, y: 10, z: -12, yaw: 0 },
  { x: -30, y: 8, z: 2, yaw: -1.05 },
  { x: 29, y: 13, z: -4, yaw: 1 },
] as const;

export default class World {
  readonly networkPlayers: NetworkPlayers;
  readonly cameraObstacles: Object3D[] = [];
  private root = new Group();

  constructor(private scene: Scene) {
    scene.background = new Color('#79c7d7');
    const sand = new MeshStandardMaterial({ color: '#d89a55', roughness: 1 });
    const rock = new MeshStandardMaterial({ color: '#984d3c', roughness: 1 });
    const ground = new Mesh(new PlaneGeometry(120, 120), sand);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.root.add(ground);
    this.cameraObstacles.push(ground);

    for (let index = 0; index < 24; index += 1) {
      const angle = index / 24 * Math.PI * 2;
      const width = 8 + (index % 3) * 3;
      const height = 16 + (index % 5) * 3;
      const wall = new Mesh(new BoxGeometry(width, height, 9), rock);
      wall.position.set(Math.cos(angle) * 57, height / 2, Math.sin(angle) * 57);
      wall.rotation.y = -angle;
      wall.castShadow = wall.receiveShadow = true;
      addOutline(wall);
      this.root.add(wall);
      this.cameraObstacles.push(wall);
    }

    for (const [x, z, yaw] of [[-18, 0, 0], [20, -8, .5], [0, 22, 1.2]] as const) {
      const arch = new Group();
      const postGeometry = new BoxGeometry(3, 10, 3);
      const top = new Mesh(new BoxGeometry(14, 3, 3), rock);
      const left = new Mesh(postGeometry, rock);
      const right = new Mesh(postGeometry.clone(), rock);
      left.position.x = -5.5;
      right.position.x = 5.5;
      top.position.y = 5;
      arch.add(left, right, top);
      arch.position.set(x, 5, z);
      arch.rotation.y = yaw;
      this.root.add(arch);
      this.cameraObstacles.push(left, right, top);
      addOutline(left); addOutline(right); addOutline(top);
    }

    const darkRock=new MeshStandardMaterial({color:'#73382f',roughness:1}),sage=new MeshStandardMaterial({color:'#527a55',roughness:1});
    for(const[x,y,z,s]of[[-34,4,-19,1],[28,3,24,.8],[-7,3,-38,.7],[38,4,-27,1.1]]as const){const mesa=new Mesh(new CylinderGeometry(3.2*s,5*s,7*s,7),darkRock);mesa.position.set(x,y,z);addOutline(mesa);this.root.add(mesa);this.cameraObstacles.push(mesa)}
    for(const[x,z]of[[-24,28],[25,31],[-39,-2],[36,8]]as const){const cactus=new Group(),stem=new Mesh(new CylinderGeometry(.28,.38,3.7,7),sage),arm=new Mesh(new CylinderGeometry(.2,.24,1.7,7),sage);arm.rotation.z=Math.PI/2;arm.position.set(.65,.45,0);addOutline(stem);addOutline(arm);cactus.add(stem,arm);cactus.position.set(x,1.85,z);this.root.add(cactus)}
    for(const[x,z,yaw]of[[-22,-24,.35],[22,18,-.65]]as const){const ramp=new Mesh(new BoxGeometry(10,.7,5),sand);ramp.position.set(x,1.5,z);ramp.rotation.set(-.28,yaw,0);addOutline(ramp);this.root.add(ramp);this.cameraObstacles.push(ramp)}

    for (const definition of GREYBOX_RINGS) {
      const ring = new Mesh(
        new TorusGeometry(4, .45, 12, 32),
        new MeshStandardMaterial({ color: '#f6d65c', emissive: '#b86e00', emissiveIntensity: 1.2 }),
      );
      ring.position.set(definition.x, definition.y, definition.z);
      ring.rotation.y = definition.yaw;
      addOutline(ring);
      this.root.add(ring);
    }

    for (const [x, y, z] of [[-18, 3, 20], [18, 3, 20], [-18, 3, -20], [18, 3, -20]] as const) {
      const cannon = new Mesh(new CylinderGeometry(1.2, 1.7, 5, 12), new MeshStandardMaterial({ color: '#493b47' }));
      cannon.rotation.x = Math.PI / 2;
      cannon.position.set(x, y, z);
      addOutline(cannon);
      const flare=new Mesh(new TorusGeometry(1.35,.22,8,12),new MeshStandardMaterial({color:'#efbd3f'}));flare.rotation.x=Math.PI/2;flare.position.z=-2.45;cannon.add(flare);
      this.root.add(cannon);
    }

    const ambient = new AmbientLight('#fff2df', 2);
    const sun = new DirectionalLight('#fff0c0', 3);
    sun.position.set(25, 45, 15);
    sun.castShadow = true;
    this.root.add(ambient, sun);
    scene.add(this.root);
    this.networkPlayers = new NetworkPlayers(scene);
  }

  update(deltaSeconds: number, reducedMotion = false): void { this.networkPlayers.updatePlayers(deltaSeconds, reducedMotion); }

  destroy(): void {
    this.networkPlayers.destroy();
    this.root.removeFromParent();
    this.root.traverse((object: any) => {
      object.geometry?.dispose?.();
      const material = object.material;
      if (Array.isArray(material)) material.forEach((item: any) => item.dispose());
      else material?.dispose?.();
    });
  }
}

function addOutline(mesh:Mesh):void{const outline=new Mesh(mesh.geometry.clone(),new MeshBasicMaterial({color:'#281922',side:BackSide}));outline.scale.multiplyScalar(1.035);mesh.add(outline)}
