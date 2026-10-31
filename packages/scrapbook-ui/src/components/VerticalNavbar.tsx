'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
const tabs=['projects','events','blogs'] as const;
export default function VerticalNavbar({name,preview=false}:{name:string;preview?:boolean}){
 const [active,setActive]=useState('projects');
 const ref=useRef<HTMLElement>(null),path=usePathname();
 useEffect(()=>{const node=ref.current;if(!node)return;const update=()=>(preview?node.parentElement!:document.documentElement).style.setProperty('--site-nav-height',`${node.offsetHeight}px`);const observer=new ResizeObserver(update);observer.observe(node);update();return()=>observer.disconnect()},[preview]);
 useEffect(()=>{if(preview)return;if(path!=='/'){setActive('blogs');return}let frame=0;const update=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const offset=ref.current?.offsetHeight||64;let largest=-1,current='projects';for(const id of tabs){const r=document.getElementById('section-'+id)?.getBoundingClientRect();if(!r)continue;const visible=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,offset));if(visible>largest){largest=visible;current=id}}setActive(current)})};window.addEventListener('scroll',update,{passive:true});update();return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update)}},[path,preview]);
 const go=(e:React.MouseEvent<HTMLAnchorElement>,id:string)=>{
  if(path!=='/'||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const section=document.getElementById('section-'+id);if(!section)return;
  e.preventDefault();
  section.scrollIntoView({block:'start',behavior:'instant'});
  setActive(id);window.dispatchEvent(new CustomEvent('ssn:section-change',{detail:{id}}));
 };
 return <header className="vertical-nav" ref={ref}>
  <a className="vertical-brand" href="https://codingclub.tech/#section-verticals" aria-label="Back to the main Coding Club verticals"><span aria-hidden="true">←</span><div><small>SSN CODING CLUB</small><strong>{name}</strong></div></a>
  <nav aria-label={`${name} navigation`}>{tabs.map((id,i)=><a key={id} href={`/#section-${id}`} onClick={e=>go(e,id)} aria-current={active===id?'location':undefined}><span>{String(i+1).padStart(2,'0')}.</span> {id}</a>)}</nav>
 </header>;
}
