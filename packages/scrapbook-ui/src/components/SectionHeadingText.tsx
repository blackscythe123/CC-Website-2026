'use client';
import {useEffect,useRef,useState} from 'react';
/** Reveal actual characters while reserving the full heading's layout. */
export default function SectionHeadingText({text}:{text:string}){
 const ref=useRef<HTMLSpanElement>(null);
 const [length,setLength]=useState(text.length);
 useEffect(()=>{
  const node=ref.current;if(!node||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let timer:ReturnType<typeof setInterval>|undefined;
  const type=()=>{clearInterval(timer);let count=0;setLength(0);timer=setInterval(()=>{count++;setLength(count);if(count>=text.length)clearInterval(timer)},42)};
  const observer=new IntersectionObserver(([entry])=>{
   if(entry.isIntersecting)type();else{clearInterval(timer);setLength(0)}
  },{threshold:.22});
  const navigate=(event:Event)=>{const id=(event as CustomEvent<{id:string}>).detail?.id;const section=node.getRootNode() instanceof ShadowRoot?(node.getRootNode() as ShadowRoot).host.closest('.ssn-scroll-panel'):node.closest('.ssn-scroll-panel');if(section?.id==='section-'+id)type()};
  window.addEventListener('ssn:section-change',navigate);
  observer.observe(node);
  return()=>{observer.disconnect();clearInterval(timer);window.removeEventListener('ssn:section-change',navigate)};
 },[text]);
 // The invisible copy reserves the full heading width; the visible typed copy
 // and cursor share one inline flow, so the cursor always follows the last letter.
 return <span ref={ref} data-section-typewriter="true" aria-label={text} style={{display:'inline-block',position:'relative',color:'inherit',letterSpacing:'inherit',margin:0}}>
  {/* Each embedded section uses its own ShadowRoot, so global CSS cannot animate this caret. */}
  <style>{`@keyframes ssn-local-caret-blink{0%,49%{opacity:1}50%,100%{opacity:0}} .ssn-local-typewriter-caret{display:inline-block!important;animation:ssn-local-caret-blink .78s steps(1,end) infinite!important;color:#e2478d;pointer-events:none}@media(prefers-reduced-motion:reduce){.ssn-local-typewriter-caret{animation:none!important}}`}</style>
  <span aria-hidden="true" style={{visibility:'hidden',whiteSpace:'pre'}}>{text}</span>
  <span aria-hidden="true" style={{position:'absolute',left:0,top:0,whiteSpace:'nowrap',color:'inherit',letterSpacing:'inherit'}}>
   {text.slice(0,length)}<span className="ssn-typewriter-caret ssn-local-typewriter-caret" style={{position:'static',verticalAlign:'baseline'}}>▍</span>
  </span>
 </span>;
}
