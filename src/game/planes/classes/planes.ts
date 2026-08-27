import { BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, TorusGeometry } from 'three';

export interface PlaneDefinition { id:string;collider:{radius:number;length:number};maxOperationalAltitude:number;deformationHooks:readonly string[];createVisual(color:string):Group }

function outlined(mesh: Mesh, color='#251a22'): void {
  const outline = new Mesh(mesh.geometry.clone(), new MeshBasicMaterial({ color, side: 1 }));
  outline.scale.multiplyScalar(1.055);
  outline.name='ink-outline';
  mesh.add(outline);
  mesh.castShadow=mesh.receiveShadow=true;
}

const biplane: PlaneDefinition = {
  id:'jelly-biplane',
  collider:{radius:1.8,length:3.8},
  maxOperationalAltitude:31,
  deformationHooks:['steer','impact','collision','boost','evade','freeze','disabled','crash'],
  createVisual(color) {
    const root=new Group(); root.name='jelly-biplane';
    const jelly=new MeshStandardMaterial({color,roughness:.48,metalness:.02,transparent:true,opacity:.94});
    const ink=new MeshStandardMaterial({color:'#33212d',roughness:.78});
    const cream=new MeshStandardMaterial({color:'#ffe099',roughness:.7});
    const body=new Mesh(new CapsuleGeometry(.58,2.7,8,16),jelly); body.name='jelly-body'; body.rotation.x=Math.PI/2; outlined(body);
    const cockpit=new Mesh(new SphereGeometry(.48,12,8),new MeshStandardMaterial({color:'#79d4e8',roughness:.25,metalness:.12})); cockpit.name='cockpit'; cockpit.scale.set(1,.62,1.15); cockpit.position.set(0,.5,-.15); outlined(cockpit);
    const wingRoot=new Group(); wingRoot.name='jelly-wings';
    for(const [y,z,scale] of [[.86,-.05,1],[-.46,.1,.92]] as const){const wing=new Mesh(new BoxGeometry(5.2,.2,1.18),jelly);wing.position.set(0,y,z);wing.scale.x=scale;outlined(wing);wingRoot.add(wing);for(const x of[-1.75,1.75]){const strut=new Mesh(new CylinderGeometry(.055,.055,1.18,6),ink);strut.position.set(x,.2,z);wingRoot.add(strut)}}
    const tail=new Mesh(new BoxGeometry(2,.14,.78),jelly);tail.position.z=1.86;outlined(tail);
    const fin=new Mesh(new BoxGeometry(.14,1.15,.75),jelly);fin.position.set(0,.54,1.74);outlined(fin);
    const nose=new Mesh(new ConeGeometry(.6,.75,14),ink);nose.rotation.x=-Math.PI/2;nose.position.z=-1.86;outlined(nose,'#130f14');
    const propeller=new Group(); propeller.name='propeller'; propeller.position.z=-2.25;
    const hub=new Mesh(new SphereGeometry(.18,8,6),cream),blade=new Mesh(new BoxGeometry(.14,2.35,.1),cream); outlined(blade); propeller.add(hub,blade);
    const wheels=new Group(); wheels.name='landing-gear';
    for(const x of[-.72,.72]){const strut=new Mesh(new CylinderGeometry(.045,.045,.85,6),ink);strut.position.set(x,-.72,-.15);strut.rotation.z=x>0?.45:-.45;const wheel=new Mesh(new TorusGeometry(.28,.09,8,14),ink);wheel.position.set(x,-1,-.15);wheel.rotation.y=Math.PI/2;wheels.add(strut,wheel)}
    const scarf=new Mesh(new BoxGeometry(.18,.08,1.3),new MeshStandardMaterial({color:'#f05845',roughness:.8})); scarf.name='scarf';scarf.position.set(.36,.55,.72);scarf.rotation.y=.15;
    const smoke=new Group();smoke.name='disabled-smoke';smoke.visible=false;for(let index=0;index<4;index+=1){const puff=new Mesh(new SphereGeometry(.18+index*.09,7,5),new MeshBasicMaterial({color:'#44363d',transparent:true,opacity:.55-index*.08}));puff.position.set((index%2-.5)*.25,.35+index*.3,.8+index*.35);smoke.add(puff)}
    root.add(body,cockpit,wingRoot,tail,fin,nose,propeller,wheels,scarf,smoke);
    return root;
  },
};
const registry=new Map([[biplane.id,biplane]]);
export function getPlaneDefinition(id:string):PlaneDefinition{return registry.get(id)??biplane}
export const PLANE_DEFINITIONS=registry;
