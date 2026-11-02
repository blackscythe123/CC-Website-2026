"use client";
import {useEffect,useRef} from 'react';
import {broadcastMarkup} from './broadcast-markup';
import {mountBroadcast} from './broadcast-runtime';
import './ClubBroadcast.css';
export type BroadcastItem={id:string;type:'announcement'|'news';title:string;category:string;body:string[];contentHtml?:string;date:string;source:string};
const empty:BroadcastItem[]=[];
export default function ClubBroadcast({items=empty}:{items?:BroadcastItem[]}){
 const host=useRef<HTMLElement>(null);
 useEffect(()=>{
  const root=host.current;if(!root)return;const clean=mountBroadcast(root,items);
  let disposed=false,cleanupMesh:(()=>void)|undefined;
  // Load the 3D renderer only when approaching the section. SVG remains the fallback.
  const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();import('./broadcast-megaphone').then(({mountMegaphone})=>{if(!disposed)cleanupMesh=mountMegaphone(root)}).catch(()=>{})},{rootMargin:'400px'});observer.observe(root);
  return()=>{disposed=true;observer.disconnect();clean();cleanupMesh?.()};
 },[items]);
 return <section ref={host} id="section-dispatches" className="club-broadcast" aria-label="Club announcements and latest news" dangerouslySetInnerHTML={{__html:broadcastMarkup}}/>;
}
