"use client";
import {useEffect,useRef,type RefObject} from 'react';
import gsap from 'gsap';
type Vec={x:number;y:number;z:number};
type Projected={x:number;y:number;depth:number};
export type BloomProgress={bloom:number;outline?:{cx:number;cy:number;rx:number;ry:number;points:Array<{x:number;y:number}>}};
// A software-projected 3D surface keeps the same bloom on browsers without WebGL.
export default function JellyFlowers({paused,progress}:{paused:boolean;progress:RefObject<BloomProgress>}){
 const canvas=useRef<HTMLCanvasElement>(null),pause=useRef(paused);pause.current=paused;
 useEffect(()=>{
  const node=canvas.current;if(!node)return;const ctx=node.getContext('2d');if(!ctx)return;
  let w=1,h=1,dpr=1,last=performance.now(),time=0,visible=false,cardWidth=144;const pointer={x:0,y:0};const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const resize=()=>{w=node.clientWidth;h=node.clientHeight;cardWidth=node.parentElement?.querySelector<HTMLElement>('[data-community-link]')?.offsetWidth||144;dpr=Math.min(window.devicePixelRatio,2);node.width=Math.round(w*dpr);node.height=Math.round(h*dpr)};
  const ro=new ResizeObserver(resize);ro.observe(node);resize();const io=new IntersectionObserver(([e])=>{visible=e.isIntersecting});io.observe(node);
  const move=(e:PointerEvent)=>{const r=node.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width-.5)*.12;pointer.y=((e.clientY-r.top)/r.height-.5)*.08};node.parentElement?.addEventListener('pointermove',move);
  let ct=1,st=0,cp=1,sp=0,scale=1,ox=0,oy=0;
  const project=(p:Vec):Projected=>{
   const x=p.x*ct+p.z*st,z=-p.x*st+p.z*ct;
   const y=p.y*cp-z*sp,depth=p.y*sp+z*cp;
   const perspective=7/(7-depth);
   return {x:ox+x*scale*perspective,y:oy-y*scale*perspective,depth};
  };
  const surface=(layer:number,petal:number,s:number,v:number,bloom:number):Vec=>{
   const count=layer===0?8:layer===1?7:6,angle=petal/count*Math.PI*2+layer*.41;
   const length=layer===0?1.35:layer===1?1.12:.87;
   const opening=.10+bloom*(layer===0?1.48:layer===1?1.25:1.02);
   const width=Math.pow(Math.max(0,Math.sin(Math.PI*s)),.8)*(layer===0?.47:layer===1?.39:.31);
   const bend=.25*Math.sin(s*Math.PI)+.30*Math.pow(s,3);
   const radius=.035+Math.sin(opening)*length*s;
   const along=radius+v*v*.10*Math.sin(Math.PI*s);
   const across=v*width*(.45+.55*bloom);
   const y=Math.cos(opening)*length*s+bend*(.1+.9*bloom)+v*v*.20*Math.sin(Math.PI*s)*bloom+layer*.035;
   return {x:Math.cos(angle)*along-Math.sin(angle)*across,y:y-.10,z:Math.sin(angle)*along+Math.cos(angle)*across};
  };
  // Cache the silhouette over the complete bloom cycle. Cards must also clear
  // tall, partially closed petals, not just the low profile of an open bloom.
  const envelope:Vec[]=[];
  for(const bloom of [0,.25,.5,.75,1])for(let layer=0;layer<3;layer++)for(let petal=0;petal<(layer===0?8:layer===1?7:6);petal++)for(let j=0;j<=10;j++)for(const v of [-1,1])envelope.push(surface(layer,petal,j/10,v,bloom));
  const stroke=(points:Projected[],colour:string,width:number)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.stroke()};
  const paintBloom=(bloom:number,withStem:boolean)=>{
   // A faint physical stem gives the object scale and an oblique viewing angle.
   if(withStem){const stem=Array.from({length:40},(_,i)=>{const s=i/39;return project({x:s*.22,y:-.10-s*.37,z:s*.06})});stroke(stem,'rgba(78,159,138,.55)',2.5);stroke(stem.map(p=>({...p,x:p.x+2})),'rgba(255,255,255,.55)',.8);}
   const petals:Array<{layer:number;petal:number;depth:number}>=[];
   for(let layer=0;layer<3;layer++)for(let petal=0;petal<(layer===0?8:layer===1?7:6);petal++){const local=Math.max(0,Math.min(1,(bloom-layer*.12)/(1-layer*.12)));petals.push({layer,petal,depth:project(surface(layer,petal,.6,0,1)).depth})}
   petals.sort((a,b)=>a.depth-b.depth);
   petals.forEach(({layer,petal})=>{
    const local=Math.max(0,Math.min(1,(bloom-layer*.12)/(1-layer*.12)));
    const points=(v:number)=>Array.from({length:25},(_,i)=>project(surface(layer,petal,i/24,v,local)));
    const left=points(-1),right=points(1).reverse(),outline=[...left,...right];ctx.beginPath();outline.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
    // Palette taken from the site's pink Design, lavender CP, blue Full Stack
    // and mint Open Source notes; deeper edges keep the glass visible on cream.
    const palette=[{fill:'220,210,248',edge:'129,112,183'},{fill:'195,222,252',edge:'74,129,182'},{fill:'255,203,222',edge:'214,95,142'}];
    const colour=palette[layer],shade=.70+Math.cos(petal*.8+time*.13)*.05;
    const gradient=ctx.createLinearGradient(left[0].x,left[0].y,left[16].x,left[16].y);gradient.addColorStop(0,'rgba(255,245,251,.80)');gradient.addColorStop(.30,`rgba(${colour.fill},${shade})`);gradient.addColorStop(.72,`rgba(${colour.fill},.76)`);gradient.addColorStop(1,`rgba(${colour.fill},.64)`);ctx.fillStyle=gradient;ctx.fill();ctx.strokeStyle=`rgba(${colour.edge},.72)`;ctx.lineWidth=.9;ctx.stroke();
    // Curved mesh lines and a bright folded edge reveal the rotating volume.
    for(let rib=-6;rib<=6;rib++)stroke(points(rib/6),`rgba(${colour.edge},.34)`,.50);
    for(let row=1;row<22;row++){const s=row/23;stroke(Array.from({length:17},(_,j)=>project(surface(layer,petal,s,j/8-1,local))),`rgba(${colour.edge},.25)`,.45)}
    stroke(points(-.48),'rgba(255,255,255,.94)',1.2);
   });
   const core=project({x:0,y:.05,z:0});const glow=ctx.createRadialGradient(core.x,core.y,0,core.x,core.y,24);glow.addColorStop(0,'rgba(249,205,190,.30)');glow.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=glow;ctx.fillRect(core.x-24,core.y-24,48,48);
  };
  const render=()=>{
   const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;if(!visible||document.hidden)return;if(!pause.current&&!reduced.matches)time+=dt;
   const turn=-.28+time*.07+pointer.x,tilt=.66+Math.sin(time*.25)*.09+pointer.y;ct=Math.cos(turn);st=Math.sin(turn);cp=Math.cos(tilt);sp=Math.sin(tilt);scale=Math.max(25,Math.min(w*.21,h*.38,(w/2-cardWidth-18)/1.5));
   ox=w*.5;oy=h*.59;
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const bloom=progress.current.bloom;
   // Keep framing stable over the full cycle; the orbit itself follows the bloom.
   const edge=envelope.map(project);
   let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const p of edge){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y)}
   // Reserve room for the orbit cards above and below the petal envelope.
   const fit=Math.min(1,Math.max(100,h-125)/((maxY-minY)*1.08));
   const oldOx=ox,oldOy=oy,centerY=(minY+maxY)/2;
   scale*=fit;oy=h/2+(oldOy-centerY)*fit;
   // Use the same animated bloom value as the petals, with no separate tween
   // or delay. Current petal geometry supplies clearance as the orbit closes.
   const liveEdge:Projected[]=[];
   for(let layer=0;layer<3;layer++){
    const local=Math.max(0,Math.min(1,(bloom-layer*.12)/(1-layer*.12)));
    for(let petal=0;petal<(layer===0?8:layer===1?7:6);petal++)for(let j=0;j<=10;j++)for(const v of [-1,1])liveEdge.push(project(surface(layer,petal,j/10,v,local)));
   }
   const expansion=.58+.42*Math.max(0,Math.min(1,bloom));
   progress.current.outline={cx:ox+((minX+maxX)/2-oldOx)*fit,cy:h/2,rx:(maxX-minX)*.54*fit*expansion,ry:(maxY-minY)*.54*fit*expansion,points:liveEdge};
   // Small companion blooms face the viewer and sit behind the central scene.
   const main={ct,st,cp,sp,scale,ox,oy};
   ctx.globalAlpha=.85;
   for(let i=0;i<2;i++){
    const turn=time*.09+i*.8;ct=Math.cos(turn);st=Math.sin(turn);cp=Math.cos(1.48);sp=Math.sin(1.48);
    scale=Math.min(w*.072,h*.135);ox=w*(i===0?.065:.935);oy=h*(i===0?.14:.83);
    // Conservative perspective-safe radius includes the entire petal surface,
    // not just sampled edge vertices. Leave extra space for borders/highlights.
    const safeRadius=scale*1.9+16;
    ox=Math.max(safeRadius,Math.min(w-safeRadius,ox));
    oy=Math.max(safeRadius,Math.min(h-safeRadius,oy));
    const smallBloom=reduced.matches?.85:.26+.74*(.5+.5*Math.sin(time*.48+i*2.4));
    paintBloom(smallBloom,false);
   }
   // Curved leaves fall diagonally with flutter and tumbling. They use
   // the same projection and clock as the bloom, so pause/reduced motion apply.
   ctx.globalAlpha=.82;
   for(let i=0;i<2;i++){
    const phase=time*1.65+i*2.4;
    const duration=i===0?4.2:4.9;
    const cycle=Math.floor(time/duration+i*.53);
    const travel=reduced.matches?(i===0?.30:.72):(time/duration+i*.53)%1;
    const direction=(cycle+i)%2===0?1:-1;
    const lane=.10+((cycle*37+i*29)%55)/100;
    const turn=phase*.85+i;
    ct=Math.cos(turn);st=Math.sin(turn);cp=Math.cos(.85+Math.sin(phase*1.4)*.48);sp=Math.sin(.85+Math.sin(phase*1.4)*.48);
    scale=Math.min(w*.060,43);
    const horizontal=direction===1?lane+travel*.65:1-lane-travel*.65;
    ox=w*horizontal+Math.sin(phase*1.25)*Math.min(w*.065,55);
    oy=-90+travel*(h+180)+Math.sin(phase*.7)*12;
    ctx.globalAlpha=.92*Math.min(1,travel*10,(1-travel)*10);
    const leafPoint=(t:number,side:number)=>project({x:(t-.5)*1.8,y:Math.sin(t*Math.PI)*.36+side*.08*Math.sin(t*Math.PI),z:side*Math.pow(Math.sin(t*Math.PI),.85)*.48*(.8+.2*t)});
    const outline=[...Array.from({length:25},(_,j)=>leafPoint(j/24,-1)),...Array.from({length:25},(_,j)=>leafPoint(1-j/24,1))];
    const start=leafPoint(0,0),end=leafPoint(1,0),fill=ctx.createLinearGradient(start.x,start.y,end.x,end.y);
    fill.addColorStop(0,i===0?'rgba(112,163,143,.82)':'rgba(160,143,192,.82)');
    fill.addColorStop(.55,i===0?'rgba(197,226,208,.78)':'rgba(223,213,242,.78)');
    fill.addColorStop(1,'rgba(246,249,238,.65)');
    ctx.beginPath();outline.forEach((p,j)=>j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    ctx.strokeStyle=i===0?'rgba(87,134,113,.65)':'rgba(126,107,161,.65)';ctx.lineWidth=.85;ctx.stroke();
    stroke(Array.from({length:25},(_,j)=>leafPoint(j/24,0)),'rgba(255,255,255,.78)',1);
    for(const t of [.25,.42,.59,.73])for(const side of [-1,1])stroke([leafPoint(t,0),leafPoint(Math.min(.95,t+.16),side*.78)],'rgba(89,124,99,.26)',.65);
    stroke([project({x:-1.08,y:-.08,z:0}),leafPoint(0,0)],'rgba(98,130,103,.75)',1.3);
   }
   ctx.globalAlpha=1;({ct,st,cp,sp,scale,ox,oy}=main);
   paintBloom(bloom,true);
  };gsap.ticker.add(render);
  return()=>{gsap.ticker.remove(render);ro.disconnect();io.disconnect();node.parentElement?.removeEventListener('pointermove',move)};
 },[progress]);
 return <canvas ref={canvas} aria-hidden="true" data-flower-renderer="projected-3d"/>;
}
