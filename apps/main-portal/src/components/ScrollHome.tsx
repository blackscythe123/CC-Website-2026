"use client";
import {useCallback,useEffect,useRef} from 'react';
import Landing from './Landing';
import useSectionEntrances from './useSectionEntrances';
import Verticals from './Verticals';
import People from './People';
import JoinUs from './JoinUs';
import ProjectsIsolated from './ProjectsIsolated';
import EventsBooks from './EventsBooks';
import BlogsIsolated from './BlogsIsolated';
import {events} from '../data/events';
const ids=['home','verticals','projects','events','blogs','people','join'];
export default function ScrollHome(){
 useSectionEntrances();
 useEffect(()=>{const id=window.location.hash.replace('#','');if(!id.startsWith('section-'))return;let frame=0;const align=()=>{const el=document.getElementById(id),nav=document.querySelector<HTMLElement>('.ssn-global-navbar');if(el)window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-(nav?.offsetHeight||46),behavior:'instant'})};frame=requestAnimationFrame(align);return()=>cancelAnimationFrame(frame)},[]);
 const go=useCallback((route:string)=>{
  const id=route.replace(/^\//,'').replace(/^section-/,'')||'home';
  const el=document.getElementById('section-'+id);
  if(!el){window.location.assign(route);return;}
  // Exact section boundary, avoiding a visible strip of the previous section.
  const nav=document.querySelector<HTMLElement>('.ssn-global-navbar');
  const offset=nav?.getBoundingClientRect().height||66;
  const y=window.scrollY+el.getBoundingClientRect().top-offset;
  window.scrollTo({top:Math.max(0,y),behavior:'instant'});
  window.dispatchEvent(new CustomEvent('ssn:section-change',{detail:{id}}));
 },[]);
 return <div className="ssn-scroll-site"><section id="section-home" className="ssn-scroll-panel ssn-hero-panel"><Landing onNavigate={go}/></section><section id="section-verticals" className="ssn-scroll-panel"><Verticals/></section><section id="section-projects" className="ssn-scroll-panel"><ProjectsIsolated/></section><section id="section-events" className="ssn-scroll-panel"><EventsBooks events={events}/></section><section id="section-blogs" className="ssn-scroll-panel"><BlogsIsolated/></section><section id="section-people" className="ssn-scroll-panel"><People/></section><section id="section-join" className="ssn-scroll-panel"><JoinUs/></section></div>;
}
