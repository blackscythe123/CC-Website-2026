"use client";
import {useLayoutEffect,useRef,type CSSProperties} from 'react';
import {replaceNavigationUrl} from './navigation-lifecycle';
import gsap from 'gsap';
import './VerticalArrival.css';
const notes:Record<string,{name:string;color:string;lines:string;mark:string}>={
 'full-stack':{name:'Full Stack',color:'#b9e5fa',lines:'Build end-to-end experiences.',mark:'</>'},
 'ai-ml':{name:'AI / ML',color:'#f3c8ec',lines:'Explore intelligence in everything.',mark:'∿'},
 cybersecurity:{name:'Cybersecurity',color:'#cceabf',lines:'Think like an attacker. Build like a defender.',mark:'⌘'},
 'ar-vr-game-dev':{name:'AR / VR',color:'#ffd0a7',lines:'Create immersive realities.',mark:'◇'},
 'design-ui-ux':{name:'Design',color:'#ffc0d6',lines:'Design for people. Design for impact.',mark:'✦'},
 'open-source':{name:'Open Source',color:'#c4eee3',lines:'Build together. Give back.',mark:'⑂'},
 'competitive-programming':{name:'CP',color:'#d6cdf5',lines:'Think sharper. Solve smarter.',mark:'{ }'},
 ssnhacks:{name:'SSN Hacks',color:'#f7bcb0',lines:'Find your team. Build an idea. Make it happen.',mark:'↗'},
};
let intent='';
export function rememberVerticalArrival(slug:string){intent=slug;try{sessionStorage.setItem('ssn:vertical-arrival',JSON.stringify({slug,at:Date.now()}))}catch{}}
export function isStickyArrival(slug:string){
 if(typeof window==='undefined'||new URLSearchParams(location.search).get('from')!=='sticky-note')return false;
 const reload=(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type==='reload';
 let recent=false;try{const saved=JSON.parse(sessionStorage.getItem('ssn:vertical-arrival')||'null');recent=saved?.slug===slug&&Date.now()-saved.at<10000}catch{}
 return !reload||intent===slug||recent;
}
export function VerticalArrivalCard({slug}:{slug:string}){
 const note=notes[slug]??notes['full-stack'];
 const copy=<div className="arrival-note-copy"><span className="arrival-note-club">SSN CODING CLUB / YOUR NEXT CHAPTER</span><strong>{note.name}</strong><span className="arrival-note-rule"/><p>{note.lines}</p><span className="arrival-note-mark" aria-hidden="true">{note.mark}</span></div>;
 return <div className="arrival-note" aria-hidden="true" style={{'--arrival-paper':note.color} as CSSProperties}><div className="arrival-piece arrival-left">{copy}</div><div className="arrival-piece arrival-right">{copy}</div></div>;
}
export type DepartureOrigin={left:number;top:number;width:number;height:number;rotation:number};
/** Lift the chosen note over the faded board, then hand off at the same centred pose. */
export function VerticalDeparture({slug,origin,onNavigate}:{slug:string;origin:DepartureOrigin;onNavigate:()=>void}){
 const ref=useRef<HTMLDivElement>(null),navigate=useRef(onNavigate),sent=useRef(false);navigate.current=onNavigate;
 useLayoutEffect(()=>{
  const node=ref.current;if(!node)return;
  const finish=()=>{if(sent.current)return;sent.current=true;navigate.current()};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return}
  const card=node.querySelector<HTMLElement>('.arrival-note')!;const r=card.getBoundingClientRect();
  const timeline=gsap.timeline({onComplete:finish})
   .fromTo(card,{x:origin.left+origin.width/2-r.left-r.width/2,y:origin.top+origin.height/2-r.top-r.height/2,scaleX:origin.width/r.width,scaleY:origin.height/r.height,rotation:origin.rotation},{x:0,y:0,scaleX:1,scaleY:1,rotation:0,duration:.62,ease:'power3.inOut'},0)
   .fromTo(node.querySelector('.arrival-veil'),{opacity:0},{opacity:.55,duration:.5,ease:'sine.out'},0)
   .to(node.querySelector('.arrival-veil'),{opacity:1,duration:.18,ease:'sine.in'},.72);
  return()=>{timeline.kill()};
 },[slug,origin]);
 return <div className="vertical-departure" ref={ref} role="status" aria-label={`Opening ${notes[slug]?.name??'vertical'}`}><div className="arrival-veil"/><VerticalArrivalCard slug={slug}/><span className="arrival-status">Opening your next chapter…</span></div>;
}
/** Reveal the real destination once. No preview route and no navigation on completion. */
export default function VerticalArrival({slug}:{slug:string}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const node=ref.current;if(!node||!isStickyArrival(slug))return;
  const html=document.documentElement;html.dataset.verticalArrival='pending';
  const failSafe=Number(html.dataset.verticalArrivalTimer);if(failSafe)clearTimeout(failSafe);delete html.dataset.verticalArrivalTimer;
  try{sessionStorage.removeItem('ssn:vertical-arrival')}catch{}
  let stopped=false,completed=false,frame=0,historyFrame=0,timeout:ReturnType<typeof setTimeout>|undefined,timeline:gsap.core.Timeline|undefined;const started=performance.now(),arrivalPath=location.pathname;
  const finish=()=>{
   if(stopped||completed)return;completed=true;clearTimeout(timeout);timeline?.kill();cancelAnimationFrame(frame);if(location.pathname!==arrivalPath)return;html.removeAttribute('data-vertical-arrival');intent='';
   const url=new URL(location.href);if(url.searchParams.get('from')==='sticky-note'){url.searchParams.delete('from');historyFrame=replaceNavigationUrl(url)}
  };
  const play=()=>{
   if(stopped)return;
   if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return}
   timeline=gsap.timeline({onComplete:finish})
    .to(node.querySelector('.arrival-left'),{xPercent:-160,y:30,rotation:-11,duration:.85,ease:'power2.inOut'},.3)
    .to(node.querySelector('.arrival-right'),{xPercent:160,y:-25,rotation:11,duration:.85,ease:'power2.inOut'},.3)
    .to(node.querySelector('.arrival-veil'),{opacity:0,duration:.55,ease:'sine.inOut'},.6)
    .to(node.querySelector('.arrival-status'),{opacity:0,duration:.2},.35);
  };
  // Projects mounts inside its ShadowRoot. Reveal that live instance, never a duplicate.
  const ready=()=>{if(stopped)return;const host=document.querySelector('#section-projects .vertical-project-surface > div');const loaded=!!host?.shadowRoot?.querySelector('.roll-scroll');if(loaded||performance.now()-started>1800)play();else frame=requestAnimationFrame(ready)};
  frame=requestAnimationFrame(ready);
  const skip=(event:KeyboardEvent)=>{if(event.key==='Escape')finish()};window.addEventListener('keydown',skip);
  timeout=setTimeout(finish,4000);
  return()=>{stopped=true;cancelAnimationFrame(frame);cancelAnimationFrame(historyFrame);clearTimeout(timeout);timeline?.kill();window.removeEventListener('keydown',skip);html.removeAttribute('data-vertical-arrival')};
 },[slug]);
 return <div className="vertical-arrival" ref={ref} aria-hidden="true"><div className="arrival-veil"/><VerticalArrivalCard slug={slug}/><span className="arrival-status">Opening your next chapter…</span></div>;
}
