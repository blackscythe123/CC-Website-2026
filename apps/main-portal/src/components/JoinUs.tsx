"use client";
import {useState,useEffect,useRef} from 'react';
import {Github,Instagram,Linkedin,MessageCircle,ArrowUpRight,Pause,Play,RotateCcw} from 'lucide-react';
import gsap from 'gsap';
import SectionHeadingText from './SectionHeadingText';
import JellyFlowers,{type BloomProgress} from './JellyFlowers';
import {communityLinks,type CommunityPlatform} from '../data/community';
import styles from './JoinUs.module.css';
function PlatformIcon({id}:{id:CommunityPlatform}){
 if(id==='discord')return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.7 5.1a18 18 0 0 0-4.4-1.4l-.6 1.2a16 16 0 0 0-5.4 0l-.6-1.2a18 18 0 0 0-4.4 1.4C1.5 9.2.8 13.2 1.2 17.1a18 18 0 0 0 5.4 2.7l1.1-1.8-1.7-.8.4-.3a13.5 13.5 0 0 0 11.2 0l.4.3-1.7.8 1.1 1.8a18 18 0 0 0 5.4-2.7c.5-4.5-.8-8.5-3.1-12ZM8.5 14.8c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg>;
 const Icon=id==='github'?Github:id==='instagram'?Instagram:id==='linkedin'?Linkedin:MessageCircle;
 return <Icon aria-hidden="true" strokeWidth={1.6}/>;
}

export default function JoinUs(){
 const [paused,setPaused]=useState(false),[selected,setSelected]=useState<CommunityPlatform|null>(null);
 const stage=useRef<HTMLDivElement>(null),progress=useRef<BloomProgress>({bloom:0}),timeline=useRef<gsap.core.Timeline|null>(null),pulse=useRef<gsap.core.Tween|null>(null);
 const pausedRef=useRef(false),hovered=useRef(false),focused=useRef(false),replayRef=useRef<()=>void>(()=>{});pausedRef.current=paused;
 useEffect(()=>{
  const node=stage.current;if(!node)return;const links=Array.from(node.querySelectorAll<HTMLElement>('[data-community-link]'));
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let revealed=false,visible=false,angle=0,last=performance.now();
  const location=(i:number)=>{
   const a=-Math.PI*.9+i*Math.PI*2/links.length+angle,nx=Math.cos(a),ny=Math.sin(a),depth=(ny+1)/2,scale=.91+depth*.09;
   const outline=progress.current.outline;
   const cx=outline?.cx??node.clientWidth*.5,cy=outline?.cy??node.clientHeight*.5;
   const rx=outline?outline.rx:node.clientWidth*.17;
   const ry=outline?outline.ry:node.clientHeight*.20;
   // Trace the petal ellipse, then offset along its outward normal. Only the
   // main petal silhouette participates: neither stems nor companion blooms.
   const ex=Math.cos(a)*rx,ey=Math.sin(a)*ry;
   const normalLength=Math.hypot(nx/Math.max(rx,1),ny/Math.max(ry,1));
   const ux=nx/Math.max(rx,1)/normalLength,uy=ny/Math.max(ry,1)/normalLength;
   const support=outline?outline.points.reduce((m,p)=>Math.max(m,(p.x-cx)*ux+(p.y-cy)*uy),-Infinity):ex*ux+ey*uy;
   const cardSupport=Math.abs(ux)*links[i].offsetWidth*scale/2+Math.abs(uy)*links[i].offsetHeight*scale/2;
   const padding=cardSupport+12+Math.max(0,support-ex*ux-ey*uy);
   return {x:cx-node.clientWidth/2+ex+ux*padding,y:cy-node.clientHeight/2+ey+uy*padding,scale,zIndex:10+Math.round(depth*10)};
  };
  const breathe=gsap.to(progress.current,{bloom:.16,duration:4.4,repeat:-1,yoyo:true,repeatDelay:.5,ease:'sine.inOut',paused:true});pulse.current=breathe;
  const tl=gsap.timeline({paused:true,onComplete:()=>{revealed=true;if(!reduced.matches&&visible&&!pausedRef.current)breathe.restart()}});timeline.current=tl;
  gsap.set(links,{x:0,y:node.clientHeight*.09,opacity:0,scale:.35,pointerEvents:'none'});
  tl.to(progress.current,{bloom:1,duration:4.2,ease:'power2.inOut'},0);
  links.forEach((link,i)=>tl.fromTo(link,{x:0,y:()=>node.clientHeight*.09,opacity:0,scale:.35,pointerEvents:'none'},{immediateRender:false,x:()=>location(i).x,y:()=>location(i).y,opacity:1,scale:()=>location(i).scale,pointerEvents:'auto',duration:1.35,ease:'power3.out'},1.8+i*.30));
  const enter=()=>{if(reduced.matches){tl.progress(1);progress.current.bloom=1;return}if(pausedRef.current)return;if(revealed)breathe.resume();else tl.play()};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)enter();else{tl.pause();breathe.pause()}},{threshold:.2});observer.observe(node);
  const navigation=(e:Event)=>{if((e as CustomEvent<{id:string}>).detail?.id==='join'){visible=true;enter()}};
  replayRef.current=()=>{angle=0;revealed=false;breathe.pause();progress.current.bloom=0;if(reduced.matches){tl.progress(1);progress.current.bloom=1}else tl.restart()};
  const resizeObserver=new ResizeObserver(()=>{if(revealed){links.forEach((link,i)=>gsap.set(link,location(i)));return}const at=tl.progress(),held=tl.paused();tl.invalidate().restart().progress(at).paused(held)});resizeObserver.observe(node);
  const orbit=()=>{const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;if(!visible||!revealed)return;if(!reduced.matches&&!pausedRef.current&&!hovered.current&&!focused.current)angle+=dt*.15;links.forEach((link,i)=>gsap.set(link,location(i)))};
  gsap.ticker.add(orbit);window.addEventListener('ssn:section-change',navigation);
  return()=>{observer.disconnect();window.removeEventListener('ssn:section-change',navigation);resizeObserver.disconnect();gsap.ticker.remove(orbit);tl.kill();breathe.kill();timeline.current=null;pulse.current=null};
 },[]);
 useEffect(()=>{if(paused){timeline.current?.pause();pulse.current?.pause()}else if(timeline.current?.progress()===1){pulse.current?.resume()}else timeline.current?.play()},[paused]);
 const chosen=communityLinks.find(link=>link.id===selected);
 return <div className={styles.join}>
  <div className={styles.terminal}>ssn@codingclub:~$ <b>join us</b><span aria-hidden="true">▍</span></div>
  <header className={styles.heading}><div><h1><em>//</em> <SectionHeadingText text="FIND YOUR PEOPLE"/></h1><p>Good ideas start with a connection.<br/>Find yours in the Coding Club.</p></div><div className={styles.brand}><img src="/branding/ssn-coding-club.png" alt="SSN Coding Club official logo"/><span>SSN CODING CLUB<br/><small>learn. build. together.</small></span></div></header>
  <div className={styles.garden} ref={stage} onMouseLeave={()=>setSelected(null)}>
   <JellyFlowers paused={paused} progress={progress}/>
   {communityLinks.map((link,i)=>{
    const content=<><span className={styles.badge}><PlatformIcon id={link.id}/></span><span><strong>{link.name}</strong><small>{link.href?link.label:'Invite coming soon'}</small></span>{link.href&&<ArrowUpRight className={styles.arrow}/>}</>;
    const props={className:styles.flowerLink,'data-community-link':link.id,style:{'--link-paper':link.color} as React.CSSProperties,onMouseEnter:()=>{hovered.current=true;setSelected(link.id)},onMouseLeave:()=>{hovered.current=false;setSelected(null)},onFocus:()=>{focused.current=true;setSelected(link.id)},onBlur:()=>{focused.current=false;setSelected(null)}};
    return link.href?<a {...props} key={link.id} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.name}: ${link.label} (opens in a new tab)`}>{content}</a>:<div {...props} key={link.id} aria-disabled="true" aria-label="WhatsApp invite coming soon">{content}</div>;
   })}
  </div>
  <div className={styles.bottom}><p aria-live="polite">{chosen?<><strong>{chosen.name}</strong> / {chosen.detail}</>:<>One community. <strong>Room for your next idea.</strong></>}</p><div className={styles.controls}><button type="button" onClick={()=>{setPaused(false);replayRef.current()}}><RotateCcw size={13}/> Bloom again</button><button type="button" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={13}/>:<Pause size={13}/>} {paused?'Resume':'Pause'}</button></div></div>
 </div>;
}
