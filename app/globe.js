import $ from 'jquery';
import { orbitPoint, periodSeconds } from './model.js';

const identity = () => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const normalize = a => {const n=Math.hypot(...a);return a.map(v=>v/n);};
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function perspective(aspect){const f=1/Math.tan(39*Math.PI/360),near=.1,far=100;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);}
function viewMatrix(eye){const z=normalize([eye[0],eye[1]+.025,eye[2]]),x=normalize(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function rotationY(angle,scale=1){const c=Math.cos(angle)*scale,s=Math.sin(angle)*scale;return new Float32Array([c,0,-s,0,0,scale,0,0,s,0,c,0,0,0,0,1]);}

/** A native WebGL orbital renderer. jQuery owns its input events and lifecycle. */
export function createGlobe(container,getFleet,getSelected,onSelect,onPosition){
  const canvas=$('<canvas>',{'aria-hidden':'true'}).appendTo(container)[0];
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});
  if(!gl){canvas.remove();throw new Error('WebGL is unavailable.');}
  const buffers=[],programs=[],shaders=[];
  let disposed=false,contextLost=false,orbitsVisible=true,gridVisible=false,secondsNow=0,eye=[3.1,1.5,5.2],vp=identity();
  const initial={theta:Math.atan2(3.1,5.2),phi:Math.acos(1.5/Math.hypot(3.1,1.5,5.2)),distance:Math.hypot(3.1,1.5,5.2)};
  const camera={...initial},target={...initial},projected=[];
  const pointers=new Map();let gesture=null,moved=false;
  function program(vertex,fragment){
    const p=gl.createProgram();programs.push(p);
    for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));gl.attachShader(p,shader);}
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;
  }
  const vertex=`attribute vec3 aPosition;attribute vec2 aUV;uniform mat4 uModel;uniform mat4 uVP;varying vec3 vPosition;varying vec3 vNormal;varying vec2 vUV;void main(){vec4 world=uModel*vec4(aPosition,1.0);vPosition=world.xyz;vNormal=normalize(mat3(uModel)*aPosition);vUV=aUV;gl_Position=uVP*world;}`;
  const earthProgram=program(vertex,`precision mediump float;uniform sampler2D uTexture;uniform vec3 uEye;uniform bool uAtmosphere;varying vec3 vPosition;varying vec3 vNormal;varying vec2 vUV;void main(){vec3 n=normalize(vNormal),v=normalize(uEye-vPosition);float rim=pow(1.0-abs(dot(n,v)),3.8);if(uAtmosphere){gl_FragColor=vec4(0.18,0.50,0.95,rim*0.48);return;}vec3 surface=texture2D(uTexture,vUV).rgb;float sun=max(dot(n,normalize(vec3(-3.0,3.0,5.0))),0.0);vec3 color=surface*(0.23+sun*1.35);color+=vec3(0.035,0.11,0.25)*rim;gl_FragColor=vec4(color,1.0);}`);
  const lineProgram=program(`attribute vec3 aPosition;uniform mat4 uModel;uniform mat4 uVP;uniform float uSize;void main(){gl_Position=uVP*uModel*vec4(aPosition,1.0);gl_PointSize=uSize;}`,`precision mediump float;uniform vec4 uColor;uniform bool uPoints;void main(){float alpha=uColor.a;if(uPoints){float r=length(gl_PointCoord*2.0-1.0);if(r>1.0)discard;alpha*=1.0-smoothstep(0.4,1.0,r);}gl_FragColor=vec4(uColor.rgb,alpha);}`);
  function locations(p,names){return Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(p,name)]));}
  const eu=locations(earthProgram,['uModel','uVP','uTexture','uEye','uAtmosphere']),lu=locations(lineProgram,['uModel','uVP','uSize','uColor','uPoints']);
  const ep=gl.getAttribLocation(earthProgram,'aPosition'),uv=gl.getAttribLocation(earthProgram,'aUV'),lp=gl.getAttribLocation(lineProgram,'aPosition');
  function buffer(data,targetType=gl.ARRAY_BUFFER){const b=gl.createBuffer();buffers.push(b);gl.bindBuffer(targetType,b);gl.bufferData(targetType,data,gl.STATIC_DRAW);return b;}
  const positions=[],uvs=[],indices=[],rows=64,columns=96;
  for(let row=0;row<=rows;row++){const v=row/rows,phi=v*Math.PI;for(let col=0;col<=columns;col++){const u=col/columns,a=u*Math.PI*2;positions.push(-Math.cos(a)*Math.sin(phi),Math.cos(phi),Math.sin(a)*Math.sin(phi));uvs.push(u,1-v);}}
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const a=row*(columns+1)+col,b=a+columns+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const spherePositions=buffer(new Float32Array(positions)),sphereUV=buffer(new Float32Array(uvs)),sphereIndices=buffer(new Uint16Array(indices),gl.ELEMENT_ARRAY_BUFFER);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([14,35,61,255]));
  const image=new Image();image.onload=()=>{if(disposed||contextLost)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);};image.onerror=()=>container.dispatchEvent(new CustomEvent('asseterror',{bubbles:true}));image.src=new URL('assets/earth.jpg',document.baseURI).href;
  function lineData(points){return {buffer:buffer(new Float32Array(points)),count:points.length/3};}
  const grids=[];
  for(let latitude=-60;latitude<=60;latitude+=30){const points=[],lat=latitude*Math.PI/180;for(let j=0;j<160;j++){const a=j/160*Math.PI*2;points.push(Math.cos(lat)*Math.cos(a)*1.005,Math.sin(lat)*1.005,Math.cos(lat)*Math.sin(a)*1.005);}grids.push(lineData(points));}
  for(let longitude=0;longitude<180;longitude+=30){const points=[],lon=longitude*Math.PI/180;for(let j=0;j<160;j++){const a=j/160*Math.PI*2;points.push(Math.cos(a)*Math.cos(lon)*1.005,Math.sin(a)*1.005,Math.cos(a)*Math.sin(lon)*1.005);}grids.push(lineData(points));}
  const stationPoints=[];
  for(const [lat,lon] of [[78.2,15.6],[64.8,-147.7],[-35.4,149],[40.4,-4.2]]){const phi=lat*Math.PI/180,theta=lon*Math.PI/180;stationPoints.push(Math.cos(phi)*Math.cos(theta)*1.006,Math.sin(phi)*1.006,-Math.cos(phi)*Math.sin(theta)*1.006);}
  const stations=lineData(stationPoints),starPoints=[];let seed=72;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<480;i++){const a=random()*Math.PI*2,phi=Math.acos(2*random()-1),r=14+random()*10;starPoints.push(r*Math.sin(phi)*Math.cos(a),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(a));}
  const stars=lineData(starPoints),paths=new Map(),marker=lineData([0,0,0]);
  function sync(){for(const craft of getFleet()){if(paths.has(craft.id))continue;const points=[];for(let i=0;i<256;i++){const p=orbitPoint(craft,i/256*periodSeconds(craft.altitude));points.push(p.x,p.y,p.z);}paths.set(craft.id,lineData(points));}}
  const ratio=Math.min(window.devicePixelRatio||1,2);
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(w&&h){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);gl.viewport(0,0,canvas.width,canvas.height);}}
  const observer=new ResizeObserver(resize);observer.observe(container);
  function lines(data,mode,color,model=identity(),size=1){gl.useProgram(lineProgram);gl.bindBuffer(gl.ARRAY_BUFFER,data.buffer);gl.enableVertexAttribArray(lp);gl.vertexAttribPointer(lp,3,gl.FLOAT,false,0,0);if(uv!==lp)gl.disableVertexAttribArray(uv);gl.uniformMatrix4fv(lu.uVP,false,vp);gl.uniformMatrix4fv(lu.uModel,false,model);gl.uniform4fv(lu.uColor,color);gl.uniform1f(lu.uSize,size*ratio);gl.uniform1i(lu.uPoints,mode===gl.POINTS);gl.drawArrays(mode,0,data.count);}
  function sphere(model,atmosphere){gl.useProgram(earthProgram);gl.bindBuffer(gl.ARRAY_BUFFER,spherePositions);gl.enableVertexAttribArray(ep);gl.vertexAttribPointer(ep,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,sphereUV);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,sphereIndices);gl.uniformMatrix4fv(eu.uModel,false,model);gl.uniformMatrix4fv(eu.uVP,false,vp);gl.uniform3fv(eu.uEye,eye);gl.uniform1i(eu.uAtmosphere,atmosphere);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(eu.uTexture,0);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);}
  function screenPoint(p){const a=[p.x,p.y,p.z,1],clip=Array.from({length:4},(_,r)=>a.reduce((s,v,c)=>s+vp[c*4+r]*v,0));const vector=[p.x-eye[0],p.y-eye[1],p.z-eye[2]],length=Math.hypot(...vector),dir=normalize(vector),t=-dot(eye,dir),distanceSquared=dot(eye,eye)-t*t;const hidden=t>0&&distanceSquared<1.015*1.015&&t-Math.sqrt(1.015*1.015-distanceSquared)<length;return {x:(clip[0]/clip[3]*.5+.5)*container.clientWidth,y:(-.5*clip[1]/clip[3]+.5)*container.clientHeight,visible:!hidden&&clip[3]>0&&clip[2]/clip[3]<1};}
  function render(seconds){
    if(disposed||contextLost)return;secondsNow=seconds;
    for(const key of ['theta','phi','distance'])camera[key]+=(target[key]-camera[key])*.14;
    eye=[Math.sin(camera.phi)*Math.sin(camera.theta)*camera.distance,Math.cos(camera.phi)*camera.distance,Math.sin(camera.phi)*Math.cos(camera.theta)*camera.distance];
    vp=multiply(perspective(container.clientWidth/Math.max(container.clientHeight,1)),viewMatrix(eye));
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);
    const rotation=seconds/86164*Math.PI*2+.3;sphere(rotationY(rotation),false);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
    lines(stars,gl.POINTS,[.46,.6,.75,.5],identity(),1.7);
    if(gridVisible)for(const grid of grids)lines(grid,gl.LINE_LOOP,[.4,.64,.78,.3],rotationY(rotation));
    lines(stations,gl.POINTS,[.65,.9,.95,.9],rotationY(rotation),4);
    if(orbitsVisible)for(const [id,data] of paths)lines(data,gl.LINE_LOOP,id===getSelected()?[.76,.98,.55,.8]:[.37,.61,.69,.29]);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE);sphere(rotationY(0,1.055),true);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    projected.length=0;
    for(const craft of getFleet()){const p=orbitPoint(craft,seconds),selected=craft.id===getSelected();gl.bindBuffer(gl.ARRAY_BUFFER,marker.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,new Float32Array([p.x,p.y,p.z]));if(selected)lines(marker,gl.POINTS,[.76,.98,.55,.2],identity(),18);lines(marker,gl.POINTS,selected?[.86,1,.7,1]:[.55,.8,.86,1],identity(),selected?7:5);const screen=screenPoint(p);projected.push({id:craft.id,...screen});if(selected)onPosition(screen.x,screen.y,screen.visible);}
    gl.depthMask(true);
  }
  function pointerDown(e){const v=e.originalEvent;pointers.set(v.pointerId,{x:v.clientX,y:v.clientY});canvas.setPointerCapture(v.pointerId);moved=false;gesture={x:v.clientX,y:v.clientY};if(pointers.size===2){const [a,b]=[...pointers.values()];gesture={pinch:Math.hypot(a.x-b.x,a.y-b.y)};}}
  function pointerMove(e){const v=e.originalEvent;if(!pointers.has(v.pointerId))return;const prior=pointers.get(v.pointerId);pointers.set(v.pointerId,{x:v.clientX,y:v.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(gesture?.pinch)target.distance=Math.min(8,Math.max(3.1,target.distance*gesture.pinch/distance));gesture={pinch:distance};moved=true;return;}const dx=v.clientX-prior.x,dy=v.clientY-prior.y;if(Math.abs(dx)+Math.abs(dy)>1)moved=true;target.theta-=dx*.005;target.phi=Math.min(Math.PI-.1,Math.max(.1,target.phi-dy*.005));}
  function pointerUp(e){const v=e.originalEvent;pointers.delete(v.pointerId);if(!moved&&e.type==='pointerup'){const r=canvas.getBoundingClientRect(),x=v.clientX-r.left,y=v.clientY-r.top;const hit=projected.filter(p=>p.visible&&Math.hypot(x-p.x,y-p.y)<13).sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y))[0];if(hit)onSelect(hit.id);}gesture=null;}
  $(canvas).on('pointerdown.orbitalGlobe',pointerDown).on('pointermove.orbitalGlobe',pointerMove).on('pointerup.orbitalGlobe pointercancel.orbitalGlobe',pointerUp);
  function wheel(e){e.preventDefault();target.distance=Math.min(8,Math.max(3.1,target.distance*Math.exp(e.deltaY*.001)));}canvas.addEventListener('wheel',wheel,{passive:false});
  $(container).on('keydown.orbitalGlobe',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')target.theta-=.1;if(e.key==='ArrowRight')target.theta+=.1;if(e.key==='ArrowUp')target.phi=Math.max(.1,target.phi-.1);if(e.key==='ArrowDown')target.phi=Math.min(Math.PI-.1,target.phi+.1);if(e.key==='+')target.distance=Math.max(3.1,target.distance-.25);if(e.key==='-')target.distance=Math.min(8,target.distance+.25);});
  function lost(e){e.preventDefault();contextLost=true;onPosition(0,0,false);$(container).append($('<div>',{class:'fallback-globe',role:'status'}).text('The graphics context was interrupted. Reload to restore the orbital view.'));}canvas.addEventListener('webglcontextlost',lost);
  sync();resize();
  return {render,sync,select:()=>render(secondsNow),setOrbits:visible=>{orbitsVisible=visible;},setGrid:visible=>{gridVisible=visible;},reset:()=>Object.assign(target,initial),dispose:()=>{disposed=true;observer.disconnect();$(canvas).off('.orbitalGlobe');$(container).off('.orbitalGlobe');canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('webglcontextlost',lost);image.onload=null;image.onerror=null;buffers.forEach(b=>gl.deleteBuffer(b));programs.forEach(p=>gl.deleteProgram(p));shaders.forEach(s=>gl.deleteShader(s));gl.deleteTexture(texture);canvas.remove();}};
}
