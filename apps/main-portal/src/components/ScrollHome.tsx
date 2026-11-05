"use client";
import {useCallback,useEffect,useRef} from 'react';
import {consumeInitialReload,replaceNavigationUrl,rememberVisibleSection,reloadSection,finishSectionRestore} from '@coding-club/scrapbook-ui/navigation-lifecycle';
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
 useEffect(()=>rememberVisibleSection(ids.map(id=>'section-'+id),'.ssn-global-navbar'),[]);
 useEffect(()=>{const reloaded=reload.current??(reload.current=consumeInitialReload());const requested=reloaded?reloadSection(ids.map(id=>'section-'+id),'section-home'):window.location.hash.slice(1);const id=ids.map(id=>'section-'+id).includes(requested)?requested:'section-home';if(reloaded){replaceNavigationUrl(location.pathname+location.search+'#'+id);history.scrollRestoration='manual'}if(!id.startsWith('section-'))return;let frame=0,stopped=false;const align=()=>{if(stopped)return;const el=document.getElementById(id),nav=document.querySelector<HTMLElement>('.ssn-global-navbar');if(el)window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-(nav?.offsetHeight||46),behavior:'instant'})};let replayFrame=0;frame=requestAnimationFrame(()=>{align();if(reloaded)replayFrame=requestAnimationFrame(()=>{finishSectionRestore();window.dispatchEvent(new CustomEvent('ssn:section-change',{detail:{id:id.replace('section-','')}}))})});const observer=new ResizeObserver(align);observer.observe(document.body);const nav=document.querySelector('.ssn-global-navbar');if(nav)observer.observe(nav);const stop=()=>{stopped=true;observer.disconnect()};const finish=setTimeout(stop,2500);window.addEventListener('wheel',stop,{passive:true,once:true});window.addEventListener('pointerdown',stop,{once:true});window.addEventListener('touchstart',stop,{passive:true,once:true});return()=>{clearTimeout(finish);observer.disconnect();window.removeEventListener('wheel',stop);window.removeEventListener('pointerdown',stop);window.removeEventListener('touchstart',stop);cancelAnimationFrame(frame);cancelAnimationFrame(replayFrame)}},[]);
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
