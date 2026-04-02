export interface WarehouseZone {
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  occupancy: number;
  color?: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  size?: number;
}

export interface NetworkEdge {
  from: string;
  to: string;
  weight?: number;
}

const COLORS = [
  "0x4f86c6", "0x27ae60", "0xf39c12", "0xe74c3c",
  "0x9b59b6", "0x3498db", "0x2ecc71", "0xe67e22",
];

export function buildWarehouseScene(zones: WarehouseZone[]): string {
  const zonesJson = JSON.stringify(
    zones.map((z, i) => ({
      ...z,
      color: z.color ?? `0x${COLORS[i % COLORS.length].slice(2)}`,
    })),
  );

  return `<div id="three-container" style="width:100%;height:500px;border-radius:8px;background:#1a1a2e;"></div>
<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170/build/three.module.min.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.170/examples/jsm/controls/OrbitControls.js';

const container=document.getElementById('three-container');
if(!container){throw new Error('Container not found');}
const w=container.offsetWidth,h=container.offsetHeight;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x1a1a2e);
const camera=new THREE.PerspectiveCamera(60,w/h,0.1,1000);
camera.position.set(15,12,15);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(w,h);
container.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;

scene.add(new THREE.AmbientLight(0xffffff,0.6));
const dirLight=new THREE.DirectionalLight(0xffffff,0.8);
dirLight.position.set(10,15,10);
scene.add(dirLight);

const gridHelper=new THREE.GridHelper(20,20,0x444444,0x333333);
scene.add(gridHelper);

const zones=${zonesJson};
zones.forEach(function(z){
  const height=Math.max(0.5,z.occupancy*5);
  const geo=new THREE.BoxGeometry(z.width,height,z.depth);
  const mat=new THREE.MeshPhongMaterial({color:parseInt(z.color),transparent:true,opacity:0.85});
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(z.x,height/2,z.z);
  scene.add(mesh);

  const edges=new THREE.EdgesGeometry(geo);
  const line=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.3}));
  line.position.copy(mesh.position);
  scene.add(line);
});

function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}
animate();
window.addEventListener('resize',function(){
  const nw=container.offsetWidth,nh=container.offsetHeight;
  camera.aspect=nw/nh;camera.updateProjectionMatrix();renderer.setSize(nw,nh);
});
</script>`;
}

export function buildLogisticsNetworkScene(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
): string {
  const nodesJson = JSON.stringify(nodes);
  const edgesJson = JSON.stringify(edges);

  return `<div id="three-container" style="width:100%;height:500px;border-radius:8px;background:#0d1117;"></div>
<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170/build/three.module.min.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.170/examples/jsm/controls/OrbitControls.js';

const container=document.getElementById('three-container');
if(!container){throw new Error('Container not found');}
const w=container.offsetWidth,h=container.offsetHeight;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0d1117);
const camera=new THREE.PerspectiveCamera(60,w/h,0.1,1000);
camera.position.set(20,15,20);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(w,h);
container.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;

scene.add(new THREE.AmbientLight(0xffffff,0.5));
const dirLight=new THREE.DirectionalLight(0xffffff,0.7);
dirLight.position.set(10,20,10);
scene.add(dirLight);

const nodes=${nodesJson};
const edges=${edgesJson};
const nodeMap=new Map();
const palette=[0x4f86c6,0x27ae60,0xf39c12,0xe74c3c,0x9b59b6];

nodes.forEach(function(n,i){
  const size=n.size||1;
  const geo=new THREE.SphereGeometry(size*0.5,16,16);
  const mat=new THREE.MeshPhongMaterial({color:palette[i%palette.length],emissive:palette[i%palette.length],emissiveIntensity:0.2});
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(n.x,n.y,n.z);
  scene.add(mesh);
  nodeMap.set(n.id,mesh.position);
});

edges.forEach(function(e){
  const from=nodeMap.get(e.from);
  const to=nodeMap.get(e.to);
  if(!from||!to)return;
  const points=[from.clone(),to.clone()];
  const geo=new THREE.BufferGeometry().setFromPoints(points);
  const mat=new THREE.LineBasicMaterial({color:0x58a6ff,transparent:true,opacity:0.4});
  scene.add(new THREE.Line(geo,mat));
});

function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}
animate();
window.addEventListener('resize',function(){
  const nw=container.offsetWidth,nh=container.offsetHeight;
  camera.aspect=nw/nh;camera.updateProjectionMatrix();renderer.setSize(nw,nh);
});
</script>`;
}
