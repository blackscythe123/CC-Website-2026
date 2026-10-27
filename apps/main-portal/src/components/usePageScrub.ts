'use client';
import {useEffect,useRef,type RefObject} from 'react';
import gsap from 'gsap';
import {flushSync} from 'react-dom';

/** A fractional page position. Wheel input stays exactly where the reader stops. */
export default function usePageScrub({surface,sheet,count,enabled,initial,resetKey,onIndex,onBase,horizontalOnly=false,commitAtEnd=false,onPhase,paperCurl=false}:{surface:RefObject<HTMLDivElement|null>;sheet:RefObject<HTMLDivElement|null>;count:number;enabled:boolean;initial:number;resetKey:string;onIndex:(index:number)=>void;onBase:(index:number)=>void;horizontalOnly?:boolean;commitAtEnd?:boolean;onPhase?:(moving:boolean)=>void;paperCurl?:boolean}){
 const position=useRef({value:initial});
 const latest=useRef({onIndex,onBase,count,initial,onPhase});latest.current={onIndex,onBase,count,initial,onPhase};
 const paint=useRef(()=>{});
 const moveTo=useRef((index:number)=>{});
 const tween=useRef<gsap.core.Tween|null>(null);
 useEffect(()=>{
  const el=surface.current,node=sheet.current;if(!enabled||!el||!node)return;
  let frame=0,lastIndex=-1,lastBase=-1;
  let lastMoving:boolean|null=null;
  position.current.value=latest.current.initial;
  const draw=()=>{
   const value=position.current.value,base=Math.floor(value),fraction=value-base;
   const index=Math.min(count-1,paperCurl?Math.ceil(value):commitAtEnd?base:Math.round(value));
   const moving=fraction>.0001;
   if(base!==lastBase||index!==lastIndex||moving!==lastMoving){
    flushSync(()=>{
     if(base!==lastBase){lastBase=base;latest.current.onBase(base)}
     if(index!==lastIndex){lastIndex=index;latest.current.onIndex(index)}
     if(moving!==lastMoving){lastMoving=moving;latest.current.onPhase?.(moving)}
    });
   }
   node.style.display=fraction>.0001?'block':'none';
   const lift=paperCurl?Math.sin(Math.PI*fraction):0;
   node.style.transform=paperCurl?`translateX(${-fraction*106}%) rotate(${-2*lift}deg) translateY(${-8*lift}px)`:`rotateY(${-180*fraction}deg)`;
   node.style.setProperty('--page-curl',`${lift*42}px`);
   node.style.filter=paperCurl?`drop-shadow(${-14*lift}px ${8*lift}px ${8*lift}px #35261955)`:'none';
   node.style.transformOrigin='left center';
   node.dataset.progress=String(fraction);
   el.dataset.pagePosition=String(value);
  };
  paint.current=draw;
  const wheel=(e:WheelEvent)=>{
   if(e.ctrlKey)return;
   const horizontal=Math.abs(e.deltaX)>Math.abs(e.deltaY);
   if(horizontalOnly&&!horizontal)return;
   const raw=horizontal?e.deltaX:e.deltaY;
   if(!raw)return;
   e.preventDefault();tween.current?.kill();
   const delta=raw*(e.deltaMode===1?16:e.deltaMode===2?el.clientWidth:1);
   const distance=Math.max(360,Math.min(720,el.clientWidth*.65));
   position.current.value=Math.max(0,Math.min(count-1,position.current.value+delta/distance));
   cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);
  };
  let drag:{pointer:number;x:number;value:number;moved:boolean;direction:1|-1;node:HTMLElement}|null=null;
  const down=(e:PointerEvent)=>{
   const target=e.composedPath().find(node=>node instanceof HTMLElement) as HTMLElement|undefined;
   if(e.button!==0||!target||target.closest('a,button,input,select,textarea'))return;
   const page=target.closest<HTMLElement>('.book-spread,.newspaper');if(!page)return;
   e.preventDefault();tween.current?.kill();
   const rect=page.getBoundingClientRect();
   drag={pointer:e.pointerId,x:e.clientX,value:position.current.value,moved:false,direction:e.clientX<rect.left+rect.width/2?-1:1,node:page};
   page.setPointerCapture(e.pointerId);
  };
  const pointerMove=(e:PointerEvent)=>{
   if(!drag||drag.pointer!==e.pointerId)return;
   const dx=e.clientX-drag.x;if(Math.abs(dx)<5&&!drag.moved)return;
   drag.moved=true;e.preventDefault();
   const pageWidth=drag.node.getBoundingClientRect().width;
   position.current.value=Math.max(0,Math.min(count-1,drag.value-dx/Math.max(240,pageWidth*.48)));
   cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);
  };
  const up=(e:PointerEvent)=>{
   if(!drag||drag.pointer!==e.pointerId)return;
   const d=drag;drag=null;
   if(d.node.hasPointerCapture(e.pointerId))d.node.releasePointerCapture(e.pointerId);
   if(e.type==='pointercancel')return;
   if(d.moved){e.preventDefault();cancelAnimationFrame(frame);draw()}
   else moveTo.current(d.direction===1?Math.floor(position.current.value+.0001)+1:Math.ceil(position.current.value-.0001)-1);
  };
  frame=requestAnimationFrame(draw);el.addEventListener('wheel',wheel,{passive:false});
  el.addEventListener('pointerdown',down);el.addEventListener('pointermove',pointerMove);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  return()=>{el.removeEventListener('wheel',wheel);el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',pointerMove);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);cancelAnimationFrame(frame);tween.current?.kill();node.style.display='none'};
 },[enabled,count,resetKey,horizontalOnly,commitAtEnd,paperCurl,surface,sheet]);
 const go=(index:number)=>{
  tween.current?.kill();
  const target=Math.max(0,Math.min(latest.current.count-1,index));
  tween.current=gsap.to(position.current,{value:target,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:.28,ease:'power1.out',onUpdate:()=>paint.current()});
 };
 moveTo.current=go;
 return {go,turn:(dir:1|-1)=>go(dir===1?Math.floor(position.current.value+.0001)+1:Math.ceil(position.current.value-.0001)-1)};
}
