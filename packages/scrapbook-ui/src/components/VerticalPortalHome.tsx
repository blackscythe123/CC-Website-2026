'use client';
import {useEffect,useState} from 'react';
import useSectionEntrances from './useSectionEntrances';
import ProjectsIsolated from './ProjectsIsolated';
import EventsBooks from './EventsBooks';
import BlogsIsolated from './BlogsIsolated';
import {getVerticalContent,type VerticalSlug} from '../vertical-content';
type PublishedPost={slug:string;title:string;summary:string;date:string;author:string};
export default function VerticalPortalHome({slug,publishedPosts=[],preview=false}:{slug:VerticalSlug;publishedPosts?:PublishedPost[];preview?:boolean}){
 const [arrived]=useState(()=>{if(preview||typeof window==='undefined')return false;if(new URLSearchParams(window.location.search).get('from')==='sticky-note')return true;try{const saved=JSON.parse(sessionStorage.getItem('ssn:vertical-arrival')||'null');return saved?.slug===slug&&Date.now()-saved.at<10000}catch{return false}});
 const [motionReady,setMotionReady]=useState(!arrived);
 useSectionEntrances(!preview&&motionReady);
 useEffect(()=>{if(!arrived||motionReady)return;const enable=()=>{if((document.getElementById('section-projects')?.getBoundingClientRect().bottom??Infinity)<innerHeight*.6)setMotionReady(true)};window.addEventListener('scroll',enable,{passive:true});window.addEventListener('ssn:section-change',enable);return()=>{window.removeEventListener('scroll',enable);window.removeEventListener('ssn:section-change',enable)}},[arrived,motionReady]);
 useEffect(()=>{if(!arrived)return;sessionStorage.removeItem('ssn:vertical-arrival');const url=new URL(window.location.href);if(url.searchParams.get('from')==='sticky-note'){url.searchParams.delete('from');window.history.replaceState(window.history.state,'',url)}},[arrived]);
 const content=getVerticalContent(slug);
 useEffect(()=>{if(preview)return;const id=location.hash.slice(1);if(!['section-projects','section-events','section-blogs'].includes(id))return;const frame=requestAnimationFrame(()=>{const section=document.getElementById(id);if(section)window.scrollTo({top:scrollY+section.getBoundingClientRect().top-(document.querySelector<HTMLElement>('.vertical-nav')?.offsetHeight||64),behavior:'instant'})});return()=>cancelAnimationFrame(frame)},[preview]);
 if(preview)return <div className="ssn-scroll-site vertical-portal"><section id="preview-projects" className="ssn-scroll-panel" aria-label={`${content.category} projects preview`}><ProjectsIsolated projects={content.projects}/></section></div>;
 return <div className="ssn-scroll-site vertical-portal" data-vertical={slug}>
  <section id="section-projects" className="ssn-scroll-panel" aria-label={`${content.category} projects`}><ProjectsIsolated projects={content.projects}/></section>
  <section id="section-events" className="ssn-scroll-panel" aria-label={`${content.category} events`}><EventsBooks events={content.events}/></section>
  <section id="section-blogs" className="ssn-scroll-panel" aria-label={`${content.category} blogs`}><BlogsIsolated items={content.blogs}/>
   {publishedPosts.length>0&&<div className="vertical-published"><h2>Published articles</h2><div>{publishedPosts.map(post=><article key={post.slug}><p>{post.date} · {post.author}</p><a href={`/posts/${post.slug}`}>{post.title} ↗</a><p>{post.summary}</p></article>)}</div></div>}
  </section>
 </div>;
}
