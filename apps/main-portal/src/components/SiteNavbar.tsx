"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect,useState} from "react";
const pages=[['home','home'],['verticals','verticals'],['projects','projects'],['events','events'],['blogs','blogs'],['people','people'],['join','join us']];
export default function SiteNavbar(){
 const path=usePathname();const [active,setActive]=useState('home');
 useEffect(()=>{
  const nav=document.querySelector<HTMLElement>('.ssn-global-navbar');if(!nav)return;
  const update=()=>document.documentElement.style.setProperty('--site-nav-height',`${nav.getBoundingClientRect().height}px`);
  const observer=new ResizeObserver(update);observer.observe(nav);update();
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(path!=='/'){setActive(path.split('/')[1]||'home');return;}
  let frame=0;
  const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const nav=document.querySelector<HTMLElement>('.ssn-global-navbar');
   const offset=(nav?.offsetHeight||66)+8;
   // Choose the section occupying the most visible viewport area; don't
   // mark Projects active while the final People row is still in view.
   let best='home',largest=-1;
   const viewportTop=offset,viewportBottom=window.innerHeight;
   for(const [id] of pages){const el=document.getElementById('section-'+id);if(!el)continue;
    const r=el.getBoundingClientRect();const visible=Math.max(0,Math.min(r.bottom,viewportBottom)-Math.max(r.top,viewportTop));
    const ratio=visible/Math.max(1,viewportBottom-viewportTop);
    if(ratio>largest){largest=ratio;best=id;}
   }
   setActive(best);
  });};
  const explicit=(e:Event)=>{const id=(e as CustomEvent<{id:string}>).detail?.id;if(id)setActive(id);};
  update();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);window.addEventListener('ssn:section-change',explicit);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update);window.removeEventListener('resize',update);window.removeEventListener('ssn:section-change',explicit)};
 },[path]);
 const jump=(id:string)=>{if(path!=='/')return;const el=document.getElementById('section-'+id);if(!el)return;const nav=document.querySelector<HTMLElement>('.ssn-global-navbar');const offset=nav?.offsetHeight||66;window.scrollTo({top:Math.max(0,window.scrollY+el.getBoundingClientRect().top-offset),behavior:'instant'});setActive(id);window.dispatchEvent(new CustomEvent('ssn:section-change',{detail:{id}}));};
 return <header className="ssn-global-navbar" aria-label="Site navigation"><Link href="/#section-home" className="ssn-global-brand"><span className="ssn-global-terminal">● ● ●</span> ssn@codingclub:~</Link><nav aria-label="All pages">{pages.map(([id,label],i)=><Link key={id} href={path==='/'?'#section-'+id:id==='home'?'/':'/'+id} onClick={e=>{if(path==='/'){e.preventDefault();jump(id);}}} className={active===id?'ssn-global-active':''}>{String(i+1).padStart(2,'0')}. {label}</Link>)}</nav></header>;
}
