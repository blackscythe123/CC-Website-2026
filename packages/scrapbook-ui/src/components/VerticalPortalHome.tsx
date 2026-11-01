'use client';
import {useEffect,useLayoutEffect,useState} from 'react';
import dynamic from 'next/dynamic';
const RoadmapJourney=dynamic(()=>import('./RoadmapLab'),{ssr:false});
import {CodingLeaderboard,HallOfFame,ResourceRoom} from './CommunityExtras';
import {verticalTabs} from '../community-features';
import useSectionEntrances from './useSectionEntrances';
import ProjectsIsolated from './ProjectsIsolated';
import EventsBooks from './EventsBooks';
import BlogsIsolated from './BlogsIsolated';
import {getVerticalContent,type VerticalSlug} from '../vertical-content';
let initialNavigationHandled=false;
type PublishedPost={slug:string;title:string;summary:string;date:string;author:string};
export default function VerticalPortalHome({slug,publishedPosts=[],preview=false}:{slug:VerticalSlug;publishedPosts?:PublishedPost[];preview?:boolean}){
 const [arrived]=useState(()=>{if(preview||typeof window==='undefined')return false;if(new URLSearchParams(location.search).get('from')==='sticky-note')return true;try{const saved=JSON.parse(sessionStorage.getItem('ssn:vertical-arrival')||'null');return saved?.slug===slug&&Date.now()-saved.at<10000}catch{return false}});
 const [motionReady,setMotionReady]=useState(!arrived);
 useSectionEntrances(!preview&&motionReady);
 useEffect(()=>{if(!arrived||motionReady)return;const enable=()=>{if((document.getElementById('section-projects')?.getBoundingClientRect().bottom??Infinity)<innerHeight*.6)setMotionReady(true)};window.addEventListener('scroll',enable,{passive:true});window.addEventListener('ssn:section-change',enable);return()=>{window.removeEventListener('scroll',enable);window.removeEventListener('ssn:section-change',enable)}},[arrived,motionReady]);
 useEffect(()=>{if(arrived){sessionStorage.removeItem('ssn:vertical-arrival');const url=new URL(location.href);if(url.searchParams.get('from')==='sticky-note'){url.searchParams.delete('from');history.replaceState(history.state,'',url)}}},[arrived]);
 const content=getVerticalContent(slug);
 useLayoutEffect(()=>{if(preview)return;const reload=!initialNavigationHandled&&(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined)?.type==='reload';initialNavigationHandled=true;if(reload)history.replaceState(history.state,'',location.pathname+location.search+'#section-projects');const requested=location.hash.slice(1);const id=verticalTabs(slug).map(tab=>'section-'+tab).includes(requested)?requested:'section-projects';
  let stopped=false;const align=()=>{if(stopped)return;const section=document.getElementById(id);if(section)window.scrollTo({top:scrollY+section.getBoundingClientRect().top-(document.querySelector<HTMLElement>('.vertical-nav')?.offsetHeight||64),behavior:'instant'})};
  align();const frame=requestAnimationFrame(align);
  const stop=()=>{stopped=true};window.addEventListener('wheel',stop,{passive:true,once:true});window.addEventListener('pointerdown',stop,{once:true});window.addEventListener('touchstart',stop,{passive:true,once:true});
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('wheel',stop);window.removeEventListener('pointerdown',stop);window.removeEventListener('touchstart',stop)};
 },[preview,slug]);
 if(preview)return <div className="ssn-scroll-site vertical-portal"><section id="preview-projects" className="ssn-scroll-panel" aria-label={`${content.category} projects preview`}><ProjectsIsolated projects={content.projects}/></section></div>;
 return <div className="ssn-scroll-site vertical-portal" data-vertical={slug}>
  <section id="section-projects" className="ssn-scroll-panel" aria-label={`${content.category} projects`}><div className="vertical-project-surface"><ProjectsIsolated projects={content.projects}/></div></section>
  <section id="section-events" className="ssn-scroll-panel" aria-label={`${content.category} events`}><EventsBooks events={content.events}/></section>
  <section id="section-blogs" className="ssn-scroll-panel" aria-label={`${content.category} blogs`}><BlogsIsolated items={content.blogs}/>
   {publishedPosts.length>0&&<div className="vertical-published"><h2>Published articles</h2><div>{publishedPosts.map(post=><article key={post.slug}><p>{post.date} · {post.author}</p><a href={`/posts/${post.slug}`}>{post.title} ↗</a><p>{post.summary}</p></article>)}</div></div>}
  </section>
  {(slug==='competitive-programming'||slug==='cybersecurity')&&<CodingLeaderboard vertical={slug==='cybersecurity'?'Cybersecurity':'CP'}/>}
  {slug==='ssnhacks'&&<HallOfFame/>}
  {(slug==='competitive-programming'||slug==='ai-ml'||slug==='cybersecurity')&&<ResourceRoom vertical={slug==='ai-ml'?'AI / ML':slug==='cybersecurity'?'Cybersecurity':'CP'} blogs={content.blogs}/>}
  {(slug==='competitive-programming'||slug==='ai-ml')&&<section id="section-roadmap" className="vertical-roadmap-section" aria-label={`${content.category} learning roadmap`}><RoadmapJourney vertical={slug==='ai-ml'?'AI / ML':'CP'}/></section>}
 </div>;
}
