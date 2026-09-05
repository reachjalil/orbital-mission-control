import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { type Craft, orbitPoint, periodSeconds } from './model';

export function createGlobe(container: HTMLElement, getFleet: () => Craft[], getSelected: () => string, onSelect: (id: string) => void, onPosition: (x: number, y: number, visible: boolean) => void) {
  let disposed = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 100);
  camera.position.set(3.1, 1.5, 5.2);
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .07;
  controls.enablePan = false;
  controls.minDistance = 3.1;
  controls.maxDistance = 8;
  controls.rotateSpeed = .6;
  controls.zoomSpeed = .55;
  controls.target.set(0, -.025, 0);
  controls.saveState();
  const earthGroup = new THREE.Group(); scene.add(earthGroup);
  const earthMaterial = new THREE.MeshStandardMaterial({color:0xa3b6cc,roughness:.94,metalness:.04});
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1,96,64), earthMaterial); earthGroup.add(earth);
  const texture = new THREE.TextureLoader().load(new URL('assets/earth.jpg', document.baseURI).href, image => { if(disposed){image.dispose();return;} image.colorSpace=THREE.SRGBColorSpace;image.anisotropy=renderer.capabilities.getMaxAnisotropy();earthMaterial.map=image;earthMaterial.needsUpdate=true; }, undefined, () => { container.dispatchEvent(new CustomEvent('asseterror', {bubbles:true})); });
  scene.add(new THREE.AmbientLight(0x668bb0, 1.5));
  const sunlight = new THREE.DirectionalLight(0xc4e2ff, 3.2);sunlight.position.set(-3,3,5);scene.add(sunlight);
  const rim = new THREE.DirectionalLight(0x286ab7, 1);rim.position.set(4,-1,-3);scene.add(rim);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.055,64,48),new THREE.ShaderMaterial({
    vertexShader:'varying vec3 vNormal; varying vec3 vPosition; void main(){ vNormal = normalize(normalMatrix * normal); vec4 p=modelViewMatrix*vec4(position,1.0);vPosition=p.xyz;gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 vNormal; varying vec3 vPosition; void main(){ float rim=pow(1.0-abs(dot(normalize(vNormal),normalize(-vPosition))),3.8);gl_FragColor=vec4(0.17,0.51,0.91,rim*0.58);}',
    side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
  }));scene.add(atmosphere);
  const grid = new THREE.Group();earthGroup.add(grid);grid.visible=false;
  const gridMaterial = new THREE.LineBasicMaterial({color:0x6096b6,transparent:true,opacity:.23});
  for(let latitude=-60;latitude<=60;latitude+=30){const pts=[];const lat=latitude*Math.PI/180;for(let j=0;j<=160;j++){const a=j/160*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(lat)*Math.cos(a)*1.004,Math.sin(lat)*1.004,Math.cos(lat)*Math.sin(a)*1.004));}grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gridMaterial));}
  for(let longitude=0;longitude<180;longitude+=30){const pts=[];const lon=longitude*Math.PI/180;for(let j=0;j<=160;j++){const a=j/160*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*Math.cos(lon)*1.004,Math.sin(a)*1.004,Math.cos(a)*Math.sin(lon)*1.004));}grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gridMaterial));}
  const stationMaterial = new THREE.MeshBasicMaterial({color:0x9ad5dd});
  for(const [lat,lon] of [[78.2,15.6],[64.8,-147.7],[-35.4,149],[40.4,-4.2]]){const phi=lat*Math.PI/180,theta=lon*Math.PI/180;const station=new THREE.Mesh(new THREE.SphereGeometry(.008,8,8),stationMaterial);station.position.set(Math.cos(phi)*Math.cos(theta)*1.006,Math.sin(phi)*1.006,-Math.cos(phi)*Math.sin(theta)*1.006);earthGroup.add(station);}
  // Subtle spatial reference points; seeded so the view remains stable across reloads.
  const starPositions=[];let seed=72;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<480;i++){const theta=random()*Math.PI*2,phi=Math.acos(2*random()-1),r=14+random()*10;starPositions.push(r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));}
  const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3)),new THREE.PointsMaterial({color:0x7690af,size:.025,transparent:true,opacity:.5,sizeAttenuation:true,depthWrite:false}));scene.add(stars);
  const orbitGroup=new THREE.Group();scene.add(orbitGroup);
  type Visual={path:THREE.LineLoop;marker:THREE.Mesh;halo:THREE.Mesh};
  const visuals=new Map<string,Visual>();
  function sync(){
    for(const craft of getFleet()){
      if(visuals.has(craft.id)) continue;
      const pts=[];for(let i=0;i<256;i++){const p=orbitPoint(craft,i/256*periodSeconds(craft.altitude));pts.push(new THREE.Vector3(p.x,p.y,p.z));}
      const path=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x6e9dac,transparent:true,opacity:.25}));orbitGroup.add(path);
      const marker=new THREE.Mesh(new THREE.SphereGeometry(.013,12,12),new THREE.MeshBasicMaterial({color:craft.color}));marker.userData.craftId=craft.id;scene.add(marker);
      const halo=new THREE.Mesh(new THREE.SphereGeometry(.028,12,12),new THREE.MeshBasicMaterial({color:craft.color,transparent:true,opacity:.15,depthWrite:false}));scene.add(halo);visuals.set(craft.id,{path,marker,halo});
    }
    select();
  }
  function select(){for(const [id,v] of visuals){const selected=id===getSelected();const material=v.path.material as THREE.LineBasicMaterial;material.color.set(selected?0xc1f88b:0x598695);material.opacity=selected?.85:.25;(v.marker.material as THREE.MeshBasicMaterial).color.set(selected?0xd5ffac:0x7bbcc9);v.marker.scale.setScalar(selected?1.5:1);v.halo.visible=selected;}}
  const observer=new ResizeObserver(()=>resize());observer.observe(container);
  function resize(){const {width,height}=container.getBoundingClientRect();if(width<=0||height<=0)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}
  const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let start={x:0,y:0};
  function pointerDown(e:PointerEvent){start={x:e.clientX,y:e.clientY};}
  function pointerUp(e:PointerEvent){if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([earth,...Array.from(visuals.values()).map(v=>v.marker)]);if(hits[0]?.object.userData.craftId)onSelect(hits[0].object.userData.craftId);}
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
  function keyboard(e:KeyboardEvent){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')spherical.theta-=.1;if(e.key==='ArrowRight')spherical.theta+=.1;if(e.key==='ArrowUp')spherical.phi-=.1;if(e.key==='ArrowDown')spherical.phi+=.1;if(e.key==='+')spherical.radius=Math.max(3.1,spherical.radius-.25);if(e.key==='-')spherical.radius=Math.min(8,spherical.radius+.25);spherical.makeSafe();camera.position.setFromSpherical(spherical).add(controls.target);controls.update();}
  container.addEventListener('keydown',keyboard);
  sync();resize();
  function render(seconds:number){
    earthGroup.rotation.y=seconds/86164*Math.PI*2+.3;
    controls.update();
    for(const craft of getFleet()){const visual=visuals.get(craft.id);if(!visual)continue;const p=orbitPoint(craft,seconds);visual.marker.position.set(p.x,p.y,p.z);visual.halo.position.copy(visual.marker.position);if(craft.id===getSelected()){const projected=visual.marker.position.clone().project(camera);const towards=visual.marker.position.clone().sub(camera.position).normalize();const cast=new THREE.Ray(camera.position,towards);const intersection=cast.intersectSphere(new THREE.Sphere(new THREE.Vector3(),1.02),new THREE.Vector3());const hidden=intersection!==null&&intersection.distanceTo(camera.position)<visual.marker.position.distanceTo(camera.position);onPosition((projected.x*.5+.5)*container.clientWidth,(-projected.y*.5+.5)*container.clientHeight,!hidden&&projected.z<1);}}
    renderer.render(scene,camera);
  }
  return {render,sync,select,setOrbits:(visible:boolean)=>{orbitGroup.visible=visible;},setGrid:(visible:boolean)=>{grid.visible=visible;},reset:()=>controls.reset(),dispose:()=>{disposed=true;observer.disconnect();container.removeEventListener('keydown',keyboard);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);controls.dispose();texture.dispose();scene.traverse(object=>{const o=object as THREE.Mesh;if(o.geometry)o.geometry.dispose();if(o.material){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();}};
}
