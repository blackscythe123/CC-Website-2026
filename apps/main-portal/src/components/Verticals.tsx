'use client';
import SectionHeadingText from './SectionHeadingText';
import {useRef,useState,useEffect} from 'react';
import gsap from 'gsap';
import {ArrowUpRight,ArrowRight,MousePointer2,Star,Globe2} from 'lucide-react';
import {verticals} from '../lib/scrapbook-verticals';
import Illustration from './Illustration';
import VerticalDestination from './VerticalDestination';
export default function Verticals(){
 const [active,setActive]=useState<string|null>(null);const [typed,setTyped]=useState('');const stage=useRef<HTMLDivElement>(null);const busy=useRef(false);const flying=useRef<HTMLDivElement>(null);const leftPiece=useRef<HTMLDivElement>(null);const rightPiece=useRef<HTMLDivElement>(null);const veil=useRef<HTMLDivElement>(null);const destination=useRef<HTMLDivElement>(null);
 useEffect(()=>{const s='verticals';let n=0;const t=setInterval(()=>{n++;setTyped(s.slice(0,n));if(n===s.length)clearInterval(t)},95);return()=>clearInterval(t)},[]);
 const selected=verticals.find(v=>v.id===active);
 const [origin,setOrigin]=useState<{x:number;y:number;width:number;height:number}|null>(null);
 function go(id:string,e:React.MouseEvent<HTMLAnchorElement>){
  if(id==='pr'||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  e.preventDefault();
  if(busy.current)return;
  const rect=e.currentTarget.getBoundingClientRect();
  busy.current=true;
  setOrigin({x:rect.left,y:rect.top,width:rect.width,height:rect.height});
  setActive(id);
 }
 useEffect(()=>{
  if(!active||!origin||!flying.current||!leftPiece.current||!rightPiece.current||!veil.current||!destination.current)return;
  const node=flying.current,L=leftPiece.current,R=rightPiece.current;
  gsap.set(node,{x:0,y:0,scale:1,rotation:0,opacity:1});
  gsap.set([L,R],{xPercent:0,y:0,rotation:0,opacity:1});
  gsap.set(veil.current,{opacity:0});
  gsap.set(destination.current,{autoAlpha:0});
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tl=gsap.timeline({onComplete:()=>{const target=verticals.find(v=>v.id===active);if(target)window.location.assign(target.href)}});
  if(reduced){
   tl.to(destination.current,{autoAlpha:1,duration:.12}).to([L,R],{opacity:0,duration:.12},0);
  }else{
   const scale=Math.min(Math.min(innerWidth*.48,500)/origin.width,Math.min(innerHeight*.66,580)/origin.height);
   const dx=innerWidth/2-(origin.x+origin.width/2),dy=innerHeight/2-(origin.y+origin.height/2);
   tl.to(veil.current,{opacity:1,duration:.3},0)
     .to(node,{x:dx,y:dy,scale,duration:.55,ease:'power2.inOut'},0)
     .to(L,{xPercent:-2,rotation:-1,duration:.18,ease:'sine.inOut'},.55)
     .to(R,{xPercent:2,rotation:1,duration:.18,ease:'sine.inOut'},.55)
     .to(destination.current,{autoAlpha:1,duration:.65,ease:'sine.inOut'},.7)
     .to(L,{x:-innerWidth*.85,y:38,rotation:-15,duration:1.05,ease:'power2.inOut'},.72)
     .to(R,{x:innerWidth*.85,y:-30,rotation:14,duration:1.05,ease:'power2.inOut'},.72)
     .to(veil.current,{opacity:0,duration:.7},.8);
  }
  return()=>{tl.kill()};
 },[active,origin]);
 return <div className={`verticals-shell ${active ? "board-transitioning" : ""}`} ref={stage}>
  <header className="topline"><span>ssn@codingclub:~$ <b>{typed}</b><i className="cursor"/></span><span className="top-motto">Different perspectives.<br/>One community.</span></header>
  <section className="heading-row"><div><h1><em>//</em> <SectionHeadingText text="OUR VERTICALS"/></h1></div><div className="vertical-click-hint"><MousePointer2 size={22} aria-hidden="true"/><span>Click a sticky note<small>Explore its projects, events &amp; blogs</small></span><ArrowRight size={22} aria-hidden="true"/></div><p>Nine communities, each with its own<br/>focus, projects, events and a space to grow.</p></section>
  <div className="notes-grid">
   {verticals.map((v,i)=><a key={v.id} href={v.href} className={`sticky-note note-${i+1} ${active===v.id?'chosen':''}`} style={{'--paper':v.color,'--ink-accent':v.accent,'--angle':`${v.angle}deg`} as React.CSSProperties} onClick={e=>go(v.id,e)} aria-label={`Explore ${v.name}`}>
    <span className="paper-grain" aria-hidden="true"/><span className="paper-edge" aria-hidden="true"/><span className="paper-curl" aria-hidden="true"/><span className="paper-crease" aria-hidden="true"/><span className={`fastener ${i%3===0?'tape':i%3===1?'pin pink-pin':'pin green-pin'}`}/>
    <span className="note-number">{v.num}</span><strong className="note-name">{v.name}</strong><span className="note-rule"/><span className="note-lines">{v.lines.map((l,j)=><span key={j}>{l}</span>)}</span><span className="note-arrow"><ArrowRight size={22} strokeWidth={1.8}/></span><Illustration type={v.art}/>
    {i===1&&<span className="photo-chip">∿ ∿ ∿</span>}{i===2&&<span className="mini-sticky">secure<br/>explore<br/>defend</span>}{i===4&&<span className="swatches"><i/><i/><i/><i/><i/></span>}
   </a>)}
  </div>





  <div className="doodle-extra doodle-lightbulb" aria-hidden="true"><svg viewBox="0 0 100 120"><path d="M29 77C-4 38 30 3 59 13c37 14 23 49 3 65l-3 15H35l-6-16zM36 101h23m-20 9h17M8 12l-7-8m89 9 9-9M7 64H0m90 0h10"/></svg><span>bright ideas!</span></div>
  <div className="doodle-extra doodle-codeblock" aria-hidden="true"><svg viewBox="0 0 150 120"><rect x="6" y="8" width="138" height="99" rx="5"/><path d="M6 31h138M21 20h3m11 0h3m11 0h3M25 52l-13 12 13 12m26-24 13 12-13 12m40-30-13 36M91 89h30"/></svg><span>hello, world_</span></div>
  <div className="doodle-extra doodle-paperplane" aria-hidden="true"><svg viewBox="0 0 150 120"><path d="M8 50 140 7 96 108 73 71 8 50zm65 21L140 7 49 63m24 8-5 32 28-17M4 103q22-21 40 1"/></svg></div>
  <div className="leaf-corner"><span/><span/><span/><span/></div>
  {selected&&origin&&<div className="note-rip-overlay" aria-label={`Opening ${selected.name}`}>
    <div className="board-blur-veil" ref={veil} />
    <div className="rip-destination" ref={destination}><VerticalDestination vertical={selected} preview/></div>
    <div className="flying-sheet" ref={flying} style={{left:origin.x,top:origin.y,width:origin.width,height:origin.height,'--paper':selected.color} as React.CSSProperties}>
      <div className="rip-piece rip-piece-left" ref={leftPiece}><div className="rip-copy"><span className="rip-index">{selected.num}</span><strong>{selected.name}</strong><p>{selected.lines.join(' ')}</p><Illustration type={selected.art}/></div></div>
      <div className="rip-piece rip-piece-right" ref={rightPiece}><div className="rip-copy"><span className="rip-index">{selected.num}</span><strong>{selected.name}</strong><p>{selected.lines.join(' ')}</p><Illustration type={selected.art}/></div></div>
    </div>
  </div>}

 </div>
}
