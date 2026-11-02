import * as THREE from 'three';
export function mountMegaphone(root){
const host=root.querySelector('.speaker-float');
try{
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,60);
 camera.position.set(.8,1.6,8.4);camera.lookAt(0,.2,0);camera.zoom=1.05;
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.domElement.className='megaphone-mesh';renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Three-dimensional mesh megaphone sweeping toward the clipboard');host.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xfff5dc,0x49645a,2.6));
 const key=new THREE.DirectionalLight(0xfff4d9,4);key.position.set(-3,6,5);scene.add(key);
 const edge=new THREE.DirectionalLight(0xb5d9cc,3.4);edge.position.set(4,2,-4);scene.add(edge);
 const fill=new THREE.DirectionalLight(0xffffff,1.5);fill.position.set(3,0,6);scene.add(fill);
 const teal=new THREE.MeshStandardMaterial({color:0x173e40,metalness:.65,roughness:.26}),cream=new THREE.MeshStandardMaterial({color:0xf6e8cb,metalness:.16,roughness:.32,side:THREE.DoubleSide}),rose=new THREE.MeshStandardMaterial({color:0xa94c70,metalness:.4,roughness:.3}),brass=new THREE.MeshStandardMaterial({color:0xc2ab73,metalness:.8,roughness:.24}),dark=new THREE.MeshStandardMaterial({color:0x102c30,metalness:.35,roughness:.44,side:THREE.DoubleSide});
 const model=new THREE.Group();scene.add(model);
 function mesh(geo,material,parent=model){const m=new THREE.Mesh(geo,material);parent.add(m);return m}
 const base=mesh(new THREE.CylinderGeometry(.72,.81,.13,64),teal);base.position.y=-1.27;base.scale.z=.72;
 const trim=mesh(new THREE.CylinderGeometry(.73,.73,.035,64),brass);trim.position.y=-1.19;trim.scale.z=.72;
 const stalk=mesh(new THREE.CylinderGeometry(.11,.17,1.25,32),teal);stalk.position.y=-.58;
 const pivot=mesh(new THREE.CylinderGeometry(.2,.2,.36,40),brass);pivot.rotation.x=Math.PI/2;pivot.position.y=.09;
 const screw=mesh(new THREE.CylinderGeometry(.07,.07,.025,24),dark);screw.rotation.x=Math.PI/2;screw.position.set(0,.09,.2);
 const mount=new THREE.Group();mount.position.y=.27;model.add(mount);
 const fork=mesh(new THREE.TorusGeometry(.34,.055,12,40,Math.PI),teal,mount);fork.rotation.z=Math.PI;fork.position.y=-.06;
 const horn=new THREE.Group();horn.rotation.z=-Math.PI/2;mount.add(horn);
 const profile=[new THREE.Vector2(.22,-.78),new THREE.Vector2(.23,-.55),new THREE.Vector2(.3,-.28),new THREE.Vector2(.43,.05),new THREE.Vector2(.63,.42),new THREE.Vector2(.92,.88)];
 mesh(new THREE.LatheGeometry(profile,64),cream,horn);
 const lining=mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(p.x-.025,p.y+.009)),64),dark,horn);
 // Visible fine surface mesh makes the horn read as a constructed dimensional object.
 const grid=new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.LatheGeometry(profile,24)),new THREE.LineBasicMaterial({color:0x6d8478,transparent:true,opacity:.18,depthWrite:false}));horn.add(grid);
 function ring(radius,tube,y,material){const m=mesh(new THREE.TorusGeometry(radius,tube,16,80),material,horn);m.rotation.x=Math.PI/2;m.position.y=y;return m}
 ring(.92,.075,.88,teal);ring(.929,.013,.905,brass);ring(.225,.026,-.71,brass);
 const back=mesh(new THREE.CylinderGeometry(.25,.26,.52,48),rose,horn);back.position.y=-1.02;
 const cap=mesh(new THREE.CylinderGeometry(.245,.245,.065,48),teal,horn);cap.position.y=-1.31;
 const throat=mesh(new THREE.CylinderGeometry(.14,.22,.4,40),teal,horn);throat.position.y=.19;
 const center=mesh(new THREE.CylinderGeometry(.17,.14,.15,40),brass,horn);center.position.y=.44;
 for(let i=0;i<8;i++){const a=i*Math.PI/4,s=mesh(new THREE.SphereGeometry(.023,10,8),brass,horn);s.position.set(Math.cos(a)*.925,.88,Math.sin(a)*.925)}
 const badge=mesh(new THREE.BoxGeometry(.2,.35,.012),brass,horn);badge.position.set(0,-.24,.32);badge.rotation.x=.3;
 // The pedestal remains fixed; only the horn pivots at its physical mounting joint.
 // Move the hinge above the stem so the bell has clearance on its lower semicircle.
 mount.position.set(0,.65,1.15);
 stalk.scale.y=1.32;stalk.position.y=-.38;
 pivot.position.set(0,.65,.55);pivot.scale.y=3.5;screw.position.set(0,.65,1.19);
 const waveRings=[];for(let i=0;i<5;i++){const mat=new THREE.MeshBasicMaterial({color:0xae5078,transparent:true,opacity:0,depthWrite:false});waveRings.push(ring(1,.024,1.1,mat))}

 let visible=false,stopped=false,frame=0,emphasis=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const observer=new IntersectionObserver(entries=>visible=entries[0].isIntersecting,{threshold:.02});observer.observe(root.querySelector('.broadcast-stage'));
 function size(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width*1.6,r.height*1.4,false);camera.aspect=(r.width*1.6)/(r.height*1.4);camera.updateProjectionMatrix()}
 const resize=new ResizeObserver(size);resize.observe(host);size();host.classList.add('mesh-ready');
 function announce(){emphasis=1}root.addEventListener('club:broadcast',announce);
 function draw(time){if(stopped)return;frame=requestAnimationFrame(draw);if(!visible||document.hidden)return;const t=time/1000,phone=innerWidth<=700,a=Math.sin(t*.65);
  model.position.set(0,0,0);model.scale.setScalar(phone?1.04:.88);
  // Local horn points +X. Keep its X component positive beside the page and its
  // Y component negative above it, so neither extreme ever aims away from paper.
  const sweep=reduced.matches?0:Math.sin(t*.45);
  mount.rotation.x=phone?-.48:0;
  mount.rotation.y=phone?-.15:-.48;
  // Side: +38° → 0° → -38° (top-right, right, bottom-right).
  // Stack: -52° → -90° → -128° (bottom-right, down, bottom-left).
  mount.rotation.z=phone?-Math.PI/2-sweep*.66:-sweep*.66;
  emphasis=Math.max(0,emphasis-.012);
  waveRings.forEach((r,i)=>{const p=(t*.42-i*.18+3)%1;r.position.y=1.02+p*(phone?2.8:2.4);const scale=.94+p*(phone?.95:.78);r.scale.setScalar(scale);r.material.opacity=reduced.matches?.12:Math.pow(Math.sin(p*Math.PI),.7)*(.42+emphasis*.2)});
  renderer.render(scene,camera);
 }
 frame=requestAnimationFrame(draw);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();host.classList.remove('mesh-ready');stopped=true;cancelAnimationFrame(frame)});
 return()=>{stopped=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();root.removeEventListener('club:broadcast',announce);scene.traverse(o=>{o.geometry?.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose())}});renderer.dispose();renderer.domElement.remove();host.classList.remove('mesh-ready')};
}catch(error){host?.classList.remove('mesh-ready');console.warn('Using the megaphone fallback.',error)}

}
