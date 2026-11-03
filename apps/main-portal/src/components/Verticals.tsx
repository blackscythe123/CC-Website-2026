"use client";
import {replaceNavigationUrl} from '@coding-club/scrapbook-ui/navigation-lifecycle';
import SectionHeadingText from './SectionHeadingText';
import {useRef,useState,useEffect} from 'react';
import {ArrowRight} from 'lucide-react';
import {verticals} from '../lib/scrapbook-verticals';
import Illustration from './Illustration';
import {VerticalDeparture,rememberVerticalArrival,type DepartureOrigin} from '@coding-club/scrapbook-ui/VerticalArrival';
export default function Verticals(){
 const [active,setActive]=useState<string|null>(null),[typed,setTyped]=useState('');const busy=useRef(false),warmed=useRef(new Set<string>());
 const [origin,setOrigin]=useState<DepartureOrigin|null>(null);
 useEffect(()=>{
  let frame=0;
  const restore=()=>{
   if(location.pathname!=='/')return;
   busy.current=false;setActive(null);setOrigin(null);
   if(location.hash==='#section-verticals'){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const section=document.getElementById('section-verticals'),nav=document.querySelector<HTMLElement>('.ssn-global-navbar');if(section)scrollTo({top:scrollY+section.getBoundingClientRect().top-(nav?.offsetHeight||64),behavior:'instant'})})}
  };
  restore();window.addEventListener('pageshow',restore);window.addEventListener('popstate',restore);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('pageshow',restore);window.removeEventListener('popstate',restore)};
 },[]);
 const canonical=(id:string)=>({'ar-vr':'ar-vr-game-dev',design:'design-ui-ux'} as Record<string,string>)[id]||id;
 useEffect(()=>{const s='verticals';let n=0;const t=setInterval(()=>{setTyped(s.slice(0,++n));if(n===s.length)clearInterval(t)},95);return()=>clearInterval(t)},[]);

 function warm(href:string){const origin=new URL(href,location.origin).origin;if(origin===location.origin||warmed.current.has(origin))return;warmed.current.add(origin);const link=document.createElement('link');link.rel='preconnect';link.href=origin;link.crossOrigin='anonymous';document.head.appendChild(link)}
 function go(id:string,e:React.MouseEvent<HTMLAnchorElement>){
  if(id==='pr'||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  e.preventDefault();if(busy.current)return;const target=verticals.find(v=>v.id===id);if(!target)return;
  const rect=e.currentTarget.getBoundingClientRect();setOrigin({left:rect.left,top:rect.top,width:rect.width,height:rect.height,rotation:parseFloat(getComputedStyle(e.currentTarget).getPropertyValue('--angle'))||0});
  replaceNavigationUrl('/#section-verticals');
  busy.current=true;setActive(id);
  warm(target.href);
 }
 return <div className={`verticals-shell ${active?'note-departing':''}`}>
  <header className="topline"><span>ssn@codingclub:~$ <b>{typed}</b><i className="cursor"/></span><span className="top-motto">Different perspectives.<br/>One community.</span></header>
  <section className="heading-row"><div><h1><em>//</em> <SectionHeadingText text="OUR VERTICALS"/></h1></div><div className="vertical-click-hint"><span>Click a sticky note<small>find your vertical</small></span><svg viewBox="0 0 72 74" aria-hidden="true"><path d="M9 7C45 1 61 21 49 43Q43 54 30 63M28 47l1 18 19-5"/></svg></div><p>Nine communities, each with its own<br/>focus, projects, events and a space to grow.</p></section>
  <div className="notes-grid">
   {verticals.map((v,i)=><a key={v.id} href={v.href} className={`sticky-note note-${i+1} ${active===v.id?'chosen':''}`} style={{'--paper':v.color,'--ink-accent':v.accent,'--angle':`${v.angle}deg`} as React.CSSProperties} onMouseEnter={()=>warm(v.href)} onFocus={()=>warm(v.href)} onClick={e=>go(v.id,e)} aria-label={`Explore ${v.name}`}>
    <span className="paper-grain" aria-hidden="true"/><span className="paper-edge" aria-hidden="true"/><span className="paper-curl" aria-hidden="true"/><span className="paper-crease" aria-hidden="true"/><span className={`fastener ${i%3===0?'tape':i%3===1?'pin pink-pin':'pin green-pin'}`}/>
    <span className="note-number">{v.num}</span><strong className="note-name">{v.name}</strong><span className="note-rule"/><span className="note-lines">{v.lines.map((l,j)=><span key={j}>{l}</span>)}</span><span className="note-arrow"><ArrowRight size={22} strokeWidth={1.8}/></span><Illustration type={v.art}/>
    {i===1&&<span className="photo-chip">∿ ∿ ∿</span>}{i===2&&<span className="mini-sticky">secure<br/>explore<br/>defend</span>}{i===4&&<span className="swatches"><i/><i/><i/><i/><i/></span>}
   </a>)}
  </div>





  <div className="doodle-extra doodle-lightbulb" aria-hidden="true"><svg viewBox="0 0 100 120"><path d="M29 77C-4 38 30 3 59 13c37 14 23 49 3 65l-3 15H35l-6-16zM36 101h23m-20 9h17M8 12l-7-8m89 9 9-9M7 64H0m90 0h10"/></svg><span>bright ideas!</span></div>
  <div className="doodle-extra doodle-codeblock" aria-hidden="true"><svg viewBox="0 0 150 120"><rect x="6" y="8" width="138" height="99" rx="5"/><path d="M6 31h138M21 20h3m11 0h3m11 0h3M25 52l-13 12 13 12m26-24 13 12-13 12m40-30-13 36M91 89h30"/></svg><span>hello, world_</span></div>
  <div className="doodle-extra doodle-paperplane" aria-hidden="true"><svg viewBox="0 0 150 120"><path d="M8 50 140 7 96 108 73 71 8 50zm65 21L140 7 49 63m24 8-5 32 28-17M4 103q22-21 40 1"/></svg></div>
  <div className="leaf-corner"><span/><span/><span/><span/></div>
  {active&&origin&&<VerticalDeparture slug={canonical(active)} origin={origin} onNavigate={()=>{const target=verticals.find(v=>v.id===active);if(!target)return;rememberVerticalArrival(canonical(active));const url=new URL(target.href,location.origin);url.searchParams.set('from','sticky-note');url.hash='section-projects';location.assign(url.toString())}}/>}
 </div>;
}
