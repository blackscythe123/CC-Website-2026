'use client';
import {useEffect} from 'react';

/** Scroll assembles objects on entry and returns them to their origins on exit. */
export default function useSectionEntrances(enabled=true){
 useEffect(()=>{
  if(!enabled)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const touched=new Set<HTMLElement>(),observed=new Set<Node>(),cleanups:Array<()=>void>=[];
  const replay=new Map<string,number>();let frame=0;
  const clamp=(v:number)=>Math.max(0,Math.min(1,v));
  const ease=(v:number)=>1-Math.pow(1-clamp(v),2);
  // Exit timing belongs to each reusable section, not a site-wide CSS override.
  // Values indicate the viewport fraction at which dismantling is complete / begins.
  const exitWindows:Record<string,{end:number;duration:number}>={
   verticals:{end:.20,duration:.55},
   projects:{end:.20,duration:.56},
   events:{end:.20,duration:.55},
   blogs:{end:.20,duration:.56},
  };
  const progress=(anchor:Element,id:string,delay=0)=>{
   const r=anchor.getBoundingClientRect(),h=window.innerHeight;
   const entry=clamp((h*.78-r.top)/(h*.68));
   // Retain a short hold at full assembly, but start each section's exit
   // ~3-4% of a viewport earlier than V4. These values are per section.
   const exitWindow=exitWindows[id]??{end:.20,duration:.52};
   const exit=clamp((r.bottom-h*exitWindow.end)/(h*exitWindow.duration));
   const start=replay.get(id);
   const arrival=start===undefined?1:clamp((performance.now()-start)/850);
   if(start!==undefined&&arrival<1)request();
   if(arrival>=1)replay.delete(id);
   return ease(clamp((Math.min(entry,exit,arrival)-delay)/(1-delay)));
  };
  const move=(el:HTMLElement|null,p:number,x:number,y:number)=>{
   if(!el)return;
   el.dataset.scrollMotion='true';touched.add(el);
   el.style.setProperty('translate',`${(x*(1-p)).toFixed(2)}px ${(y*(1-p)).toFixed(2)}px`,'important');
  };
  const baseRect=(el:HTMLElement)=>{
   const r=el.getBoundingClientRect(),parts=el.style.translate.split(' ');
   return {left:r.left-(parseFloat(parts[0])||0),top:r.top-(parseFloat(parts[1])||0),right:r.right-(parseFloat(parts[0])||0),bottom:r.bottom-(parseFloat(parts[1])||0),width:r.width,height:r.height};
  };
  const observe=(node:Node)=>{
   if(observed.has(node))return;observed.add(node);
   const observer=new MutationObserver(request);observer.observe(node,{childList:true,subtree:true});cleanups.push(()=>observer.disconnect());
   node.addEventListener('scroll',request,true);cleanups.push(()=>node.removeEventListener('scroll',request,true));
  };
  const paint=()=>{
   frame=0;const width=window.innerWidth;
   const section=(id:string)=>document.getElementById('section-'+id);
   const v=section('verticals');if(v){
    // Headings type in place rather than sliding from above.
    v.querySelectorAll<HTMLElement>('.sticky-note').forEach((el,i)=>move(el,progress(v,'verticals',.09+(i%4)*.115),i%2===0?-width*.65:width*.65,i<4?-65:90));
    move(v.querySelector('.scribble'),progress(v,'verticals',.12),120,-30);
   }
   const p=section('projects'),pr=p?.querySelector('div')?.shadowRoot;
   if(p&&pr){
    observe(pr);
    // Headings are handled by the shared typewriter component.
    move(pr.querySelector('.search-row'),progress(p,'projects'),-120,0);
    const list=pr.querySelector<HTMLElement>('.roll-scroll');
    if(list){const listRect=list.getBoundingClientRect();
     list.querySelectorAll<HTMLElement>('[data-project-id]').forEach((row,i)=>{
      const r=baseRect(row);
      const inList=clamp((listRect.bottom-r.top)/90);
      const outList=clamp((r.bottom-listRect.top)/65);
      move(row,Math.min(progress(p,'projects',.07+Math.min(i,7)*.09),ease(Math.min(inList,outList))),-Math.max(650,listRect.width+80),0);
     });
    }
    move(pr.querySelector('.paper-stage'),progress(p,'projects',.1),180,25);
   }
   const e=section('events');if(e){
    // Keep the title steady while letters are typed.
    move(e.querySelector('.calendar-tools'),progress(e,'events',.08),200,30);
    const rack=e.querySelector<HTMLElement>('.date-scroll');
    if(rack){const rackRect=rack.getBoundingClientRect();
     rack.querySelectorAll<HTMLElement>('.calendar-spine').forEach((book,i)=>{
      const r=baseRect(book);
      // Simple book drop: only dates visible in the horizontally scrolled calendar descend.
      const horizontal=clamp((rackRect.right-r.left)/Math.max(100,r.width*.9));
      const leftEdge=clamp((r.right-rackRect.left)/Math.max(50,r.width*.6));
      const ready=ease(Math.min(progress(e,'events',.04),horizontal,leftEdge));
      // Animate each landing over time, rather than snapping to the scroll fraction.
      // Month changes / horizontal scrolling reveal newly visible books individually.
      book.style.transition='translate 1150ms cubic-bezier(.2,.72,.22,1), transform .25s ease, box-shadow .25s ease';
      move(book,ready,0,-Math.min(430,window.innerHeight*.57)-(i%3)*38);
      book.style.rotate='0deg';
     });
    }
   }
   const b=section('blogs'),br=b?.querySelector('div')?.shadowRoot;
   if(b&&br){
    observe(br);const ready=progress(b,'blogs'),distance=width*.55;
    // Keep the title steady while letters are typed.
    move(br.querySelector('.archive-search'),progress(b,'blogs'),-200,0);
    const paper=br.querySelector<HTMLElement>('.newspaper');
    if(paper){paper.style.setProperty('--assembly-offset',`${distance*(1-ready)}px`);touched.add(paper);paper.querySelectorAll<HTMLElement>(':scope > .paper-rule,:scope > .newspaper-deck,:scope > .spread > .gutter').forEach(el=>{el.style.opacity=String(ready);touched.add(el)})}
    for(const selector of ['.newspaper > .spread > .paper-page:first-child','.newspaper > .paper-header > .masthead'])move(br.querySelector(selector),ready,-distance,0);
    for(const selector of ['.newspaper > .spread > .paper-page:last-child','.newspaper > .paper-header > .volume'])move(br.querySelector(selector),ready,distance,0);
    move(br.querySelector('.newspaper > .paper-bottom'),ready,0,45);
   }
   const people=section('people');if(people){
    // Keep the title steady while letters are typed.
    people.querySelectorAll<HTMLElement>('.people-team').forEach(team=>{
     const teamProgress=()=>{const rect=team.getBoundingClientRect(),h=window.innerHeight;return ease(Math.min(clamp((h*.97-rect.top)/(h*.35)),clamp((rect.bottom-h*.20)/(h*.55))));};
     move(team.querySelector('.people-team-label'),teamProgress(),-180,0);
     team.querySelectorAll<HTMLElement>('.people-draggable').forEach((photo,i)=>move(photo,ease(clamp((teamProgress()-Math.min(i,4)*.055)/(1-Math.min(i,4)*.055))),width*.65+Math.min(i,4)*70,-15));
    });
   }
  };
  function request(){if(!frame)frame=requestAnimationFrame(paint)}
  const navigation=(event:Event)=>{const id=(event as CustomEvent<{id:string}>).detail?.id;if(id)replay.set(id,performance.now());request()};
  observe(document.querySelector('.ssn-scroll-site')||document.body);
  window.addEventListener('scroll',request,{passive:true});window.addEventListener('resize',request);window.addEventListener('ssn:section-change',navigation);
  request();const ready=setTimeout(request,400);
  return()=>{clearTimeout(ready);cancelAnimationFrame(frame);cleanups.forEach(clean=>clean());window.removeEventListener('scroll',request);window.removeEventListener('resize',request);window.removeEventListener('ssn:section-change',navigation);touched.forEach(el=>{for(const prop of ['translate','rotate','opacity','--assembly-offset','transition'])el.style.removeProperty(prop);delete el.dataset.scrollMotion})};
 },[enabled]);
}
