'use client';
import SectionHeadingText from './SectionHeadingText';
import {useEffect,useState} from 'react';
import {ArrowUpRight,ArrowRight,MousePointer2,Star,Globe2} from 'lucide-react';
import {verticals} from '../lib/scrapbook-verticals';
import Illustration from './Illustration';
export default function Verticals(){
 const [typed,setTyped]=useState('');
 useEffect(()=>{let n=0;const text='verticals';const timer=setInterval(()=>{setTyped(text.slice(0,++n));if(n>=text.length)clearInterval(timer)},95);return()=>clearInterval(timer)},[]);
 return <div className="verticals-shell">
  <header className="topline"><span>ssn@codingclub:~$ <b>{typed}</b><i className="cursor"/></span><span className="top-motto">Different perspectives.<br/>One community.</span></header>
  <section className="heading-row"><div><h1><em>//</em> <SectionHeadingText text="OUR VERTICALS"/></h1></div><div className="scribble">Same<br/>community,<br/>different<br/>interests.<svg viewBox="0 0 100 90" aria-hidden="true"><path d="M88 5C24 0 12 35 34 74m-18-12 18 15 10-21"/></svg></div><p>Nine communities, each with its own<br/>focus, projects, events and a space to grow.</p></section>
  <div className="notes-grid">
   {verticals.map((v,i)=><a key={v.id} href={v.href} className={`sticky-note note-${i+1}`} style={{'--paper':v.color,'--ink-accent':v.accent,'--angle':`${v.angle}deg`} as React.CSSProperties} aria-label={`Explore ${v.name}`}>
    <span className="paper-grain" aria-hidden="true"/><span className="paper-edge" aria-hidden="true"/><span className="paper-curl" aria-hidden="true"/><span className="paper-crease" aria-hidden="true"/><span className={`fastener ${i%3===0?'tape':i%3===1?'pin pink-pin':'pin green-pin'}`}/>
    <span className="note-number">{v.num}</span><strong className="note-name">{v.name}</strong><span className="note-rule"/><span className="note-lines">{v.lines.map((l,j)=><span key={j}>{l}</span>)}</span><span className="note-arrow"><ArrowRight size={22} strokeWidth={1.8}/></span><Illustration type={v.art}/>
    {i===1&&<span className="photo-chip">∿ ∿ ∿</span>}{i===2&&<span className="mini-sticky">secure<br/>explore<br/>defend</span>}{i===4&&<span className="swatches"><i/><i/><i/><i/><i/></span>}
   </a>)}
  </div>




  
  <div className="doodle-extra doodle-lightbulb" aria-hidden="true"><svg viewBox="0 0 100 120"><path d="M29 77C-4 38 30 3 59 13c37 14 23 49 3 65l-3 15H35l-6-16zM36 101h23m-20 9h17M8 12l-7-8m89 9 9-9M7 64H0m90 0h10"/></svg><span>bright ideas!</span></div>
  <div className="doodle-extra doodle-codeblock" aria-hidden="true"><svg viewBox="0 0 150 120"><rect x="6" y="8" width="138" height="99" rx="5"/><path d="M6 31h138M21 20h3m11 0h3m11 0h3M25 52l-13 12 13 12m26-24 13 12-13 12m40-30-13 36M91 89h30"/></svg><span>hello, world_</span></div>
  <div className="doodle-extra doodle-paperplane" aria-hidden="true"><svg viewBox="0 0 150 120"><path d="M8 50 140 7 96 108 73 71 8 50zm65 21L140 7 49 63m24 8-5 32 28-17M4 103q22-21 40 1"/></svg></div>
  <div className="leaf-corner"><span/><span/><span/><span/></div>
 </div>;
}
