'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
export default function HeadingReveal(){
 const pathname=usePathname();
 useEffect(()=>{
  const root=document.querySelector('main');if(!root)return;
  const nodes=Array.from(root.querySelectorAll('h1,h2')).filter(node=>!node.querySelector('[data-section-typewriter]'));
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(entry.isIntersecting){entry.target.classList.add('ssn-typed-heading');observer.unobserve(entry.target)}
  }),{threshold:.18});
  nodes.forEach(node=>observer.observe(node));
  return()=>observer.disconnect();
 },[pathname]);
 return null;
}
