"use client";
import {useCallback,useEffect,useRef} from 'react';
import {consumeInitialReload,replaceNavigationUrl} from '@coding-club/scrapbook-ui/navigation-lifecycle';
import Landing from './Landing';
import dynamic from 'next/dynamic';
const ClubRoadmap=dynamic(()=>import('@coding-club/scrapbook-ui/RoadmapLab'),{ssr:false});
import useSectionEntrances from './useSectionEntrances';
import Verticals from './Verticals';
import AboutLetter from './AboutLetter';
import People from './People';
import JoinUs from './JoinUs';
import ProjectsIsolated from './ProjectsIsolated';
import EventsBooks from './EventsBooks';
import BlogsIsolated from './BlogsIsolated';
import {events} from '../data/events';
const ids=['home','about','verticals','projects','events','blogs','people','roadmap','join'];
export default function ScrollHome(){
 const reload=useRef<boolean|null>(null);
 useSectionEntrances();
 useEffect(()=>{const reloaded=reload.current??(reload.current=consumeInitialReload());if(reloaded){replaceNavigationUrl(location.pathname+location.search+'#section-home');history.scrollRestoration='manual'}const id=reloaded?'section-home':window.location.hash.replace('#','');if(!id.startsWith('section-'))return;let frame=0;const align=()=>{const el=document.getElementById(id),nav=document.querySelector<HTMLElement>('.ssn-global-navbar');if(el)window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-(nav?.offsetHeight||46),behavior:'instant'})};frame=requestAnimationFrame(align);return()=>cancelAnimationFrame(frame)},[]);
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
 return <div className="ssn-scroll-site"><section id="section-home" className="ssn-scroll-panel ssn-hero-panel"><Landing onNavigate={go}/></section><section id="section-about" className="ssn-scroll-panel"><AboutLetter/></section><section id="section-verticals" className="ssn-scroll-panel"><Verticals/></section><section id="section-projects" className="ssn-scroll-panel"><ProjectsIsolated/></section><section id="section-events" className="ssn-scroll-panel"><EventsBooks events={events}/></section><section id="section-blogs" className="ssn-scroll-panel"><BlogsIsolated/></section><section id="section-people" className="ssn-scroll-panel"><People/></section><section id="section-roadmap" className="vertical-roadmap-section" aria-label="SSN Coding Club roadmap"><ClubRoadmap vertical="Coding Club"/></section><section id="section-join" className="ssn-scroll-panel"><JoinUs/></section></div>;
}
