"use client";
import {useLayoutEffect,useRef} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {MotionPathPlugin} from 'gsap/MotionPathPlugin';
import SectionHeadingText from './SectionHeadingText';
export default function AboutLetter(){
 const root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  gsap.registerPlugin(ScrollTrigger,MotionPathPlugin);
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
   const ctx=gsap.context(()=>{
    const stage=root.current!.querySelector<HTMLElement>('.about-letter-stage')!;
    const letter=root.current!.querySelector<HTMLElement>('.about-letter')!;
    const navHeight=()=>document.querySelector<HTMLElement>('.ssn-global-navbar')?.offsetHeight||65;
    gsap.set('.about-envelope-entry',{y:15,rotation:-4});
    gsap.set('.about-pen',{autoAlpha:0,rotation:-22});
    gsap.set('.about-greeting-ink',{clipPath:'inset(0 100% 0 0)'});
    gsap.set('.about-ink-trail',{strokeDasharray:500,strokeDashoffset:500});
    const blocks=gsap.utils.toArray<HTMLElement>('.about-letter h2, .about-letter-lede, .about-copy-section h3, .about-copy-section p, .about-copy-index, .about-letter-values > div, .about-letter footer');
    gsap.set(blocks,{clipPath:'inset(0% 0% 100% 0%)'});
    gsap.fromTo('.about-arrival',{x:-95,y:95,rotation:-9,autoAlpha:0},{x:0,y:0,rotation:0,autoAlpha:1,ease:'power2.out',scrollTrigger:{trigger:root.current,start:'top bottom',end:()=>`top top+=${navHeight()+20}`,scrub:.45,invalidateOnRefresh:true}});
    gsap.set(letter,{y:150,scale:.78,autoAlpha:0,clipPath:'inset(0% 0% 76% 0%)'});
    gsap.set('.about-letter-fold',{rotationX:-85,autoAlpha:0,transformOrigin:'50% 0%'});
    const timeline=gsap.timeline({scrollTrigger:{trigger:stage,start:()=>`top top+=${navHeight()}`,end:()=>`+=${Math.min(innerHeight*.85,700)}`,pin:true,pinSpacing:true,scrub:.45,invalidateOnRefresh:true,anticipatePin:1}});
    timeline.to('.about-envelope-entry',{rotation:0,duration:.12,ease:'power2.out'},0)
     .to('.about-envelope-entry .about-seal',{x:90,y:30,rotation:30,scale:.85,opacity:0,duration:.15},.06)
     .to('.about-envelope-entry .about-envelope-flap',{rotationX:175,duration:.24,ease:'power2.inOut'},.15)
     .set('.about-envelope-entry .about-envelope-flap',{zIndex:0},.32)
     .to(letter,{autoAlpha:1,duration:.08},.32)
     .to(letter,{y:0,scale:1,clipPath:'inset(0% 0% 0% 0%)',duration:.38,ease:'power2.inOut'},.35)
     .set('.about-envelope-entry',{zIndex:2},.48)
     .set('.about-arrival',{zIndex:2},.48)
     .to('.about-letter-fold',{rotationX:0,duration:.3,ease:'power2.inOut'},.49)
     .to('.about-letter-fold',{autoAlpha:1,duration:.14},.68)
     .to('.about-envelope-entry',{y:300,scale:.92,duration:.25,ease:'power2.in'},.48)
     .to('.about-envelope-entry',{autoAlpha:0,duration:.08},.71)
     .to('.about-pen',{autoAlpha:1,duration:.07},.77)
     .to('.about-pen',{motionPath:{path:'.about-pen-path',align:'.about-pen-path',alignOrigin:[0,1]},duration:.24,ease:'none'},.8)
     .to('.about-greeting-ink',{clipPath:'inset(0 0% 0 0)',duration:.24,ease:'none'},.8)
     .to('.about-ink-trail',{strokeDashoffset:0,duration:.24,ease:'none'},.8)
     .fromTo('.about-underline',{scaleX:0},{scaleX:1,duration:.12},1.02)
     .to('.about-scroll-cue-open',{opacity:0,duration:.1},.6)
     .to('.about-scroll-cue-read',{opacity:1,duration:.1},.7)
     .to({}, {duration:.1});
    // The nib travels over the actual flowing letter, not a fixed desktop-sized path.
    const pen=root.current!.querySelector<SVGSVGElement>('.about-pen')!;
    const writing=root.current!.querySelector<HTMLElement>('.about-writing')!;
    const localTop=(element:HTMLElement)=>{let y=0,node:HTMLElement|null=element;while(node&&node!==letter){y+=node.offsetTop;node=node.offsetParent as HTMLElement|null}return y};
    const nibBase=()=>localTop(writing);
    const nibHeight=()=>pen.clientHeight*.91;
    const points=()=>{
     const width=Math.max(120,letter.clientWidth-(innerWidth<700?100:145));
     const coords=[{x:Math.min(280,width),y:24}];
     const bottom=letter.offsetHeight-nibBase()-28;
     for(let y=65,i=0;y<bottom;y+=70,i++){
      const x=width*[.18,.8,.36,.92,.12,.65][i%6];
      coords.push({x:Math.max(5,x-24),y:y-17},{x:Math.min(width,x+18),y:y+8},{x:Math.max(5,x-8),y:y+23});
     }
     coords.push({x:width*.76,y:bottom+30});
     return coords.map(point=>({...point,y:point.y-nibHeight()}));
    };
    const reveal=()=>{
     const nibY=Number(gsap.getProperty(pen,'y'))+nibHeight()+nibBase();
     blocks.forEach(block=>{
      const amount=gsap.utils.clamp(0,1,(nibY-localTop(block)+10)/Math.max(1,block.offsetHeight));
      gsap.set(block,{clipPath:`inset(0% 0% ${(1-amount)*100}% 0%)`});
     });
    };
    const write=gsap.fromTo(pen,{x:()=>Math.min(280,letter.clientWidth-100),y:()=>24-nibHeight(),rotation:-22},{
     motionPath:{path:points(),curviness:1.2},rotation:10,ease:'none',immediateRender:false,
     scrollTrigger:{trigger:letter,start:()=>timeline.scrollTrigger!.end-45,end:()=>Math.max(timeline.scrollTrigger!.end+100,root.current!.getBoundingClientRect().bottom+scrollY-innerHeight),scrub:.35,invalidateOnRefresh:true,onRefresh:self=>{if(self.animation){(self.animation as gsap.core.Tween).vars.motionPath={path:points(),curviness:1.2};self.animation.invalidate()}},
      onLeave:()=>gsap.set(blocks,{clipPath:'inset(0% 0% 0% 0%)'}),
      onLeaveBack:()=>gsap.set(blocks,{clipPath:'inset(0% 0% 100% 0%)'})},onUpdate:reveal
    });
    const exit=gsap.timeline({scrollTrigger:{trigger:root.current,start:'bottom bottom-=40',end:()=>`bottom top+=${navHeight()+80}`,scrub:.45,invalidateOnRefresh:true}});
    exit.to('.about-writing',{opacity:0,y:-20,duration:.15},0)
     .to('.about-letter-wrap',{rotationX:55,scale:.55,y:65,autoAlpha:0,transformOrigin:'50% 100%',duration:.43,ease:'power2.inOut'},.06)
     .fromTo('.about-envelope-exit',{autoAlpha:0,y:80,rotation:5,scale:.86},{autoAlpha:1,y:0,rotation:0,scale:1,duration:.18},.51)
     .fromTo('.about-envelope-exit .about-envelope-flap',{rotationX:175},{rotationX:0,duration:.2},.7)
     .to('.about-envelope-exit',{x:150,y:-35,rotation:9,autoAlpha:0,duration:.22},.94);
   },root);
   return()=>ctx.revert();
  });
  return()=>media.revert();
 },[]);
 return <div className="about-letter-scroll" ref={root}>
  <div className="about-letter-stage">
   <header className="about-letter-heading"><p>ssn@codingclub:~$ <b>about us</b><span className="cursor"/></p><div><h1><em>//</em> <SectionHeadingText text="A NOTE FROM US"/></h1><span className="about-scroll-cue"><span className="about-scroll-cue-open">↓ Scroll to unfold and read</span><span className="about-scroll-cue-read">↓ Keep scrolling to read</span></span></div></header>
   <div className="about-letter-desk">
    <div className="about-arrival"><div className="about-envelope about-envelope-entry" aria-hidden="true">
     <div className="about-envelope-back"/>
     <div className="about-envelope-flap"><div/><div/></div>
     <div className="about-envelope-front"><span>TO: THE NEXT CURIOUS MIND</span><small>SSN CODING CLUB · OPEN WHEN CURIOUS</small></div>
     <div className="about-seal">&lt;/&gt;<small>SSN</small></div>
     <span className="about-envelope-note">Something good starts<br/>with a little curiosity.</span>
    </div>
    </div>
    <div className="about-letter-wrap"><article className="about-letter" aria-label="About SSN Coding Club">
     <div className="about-letter-top"><div className="about-letter-meta"><span>SSN CODING CLUB</span><span>AN OPEN INVITATION ↗</span></div><div className="about-writing"><p className="about-letter-salutation"><span className="about-greeting-ink">Hey, curious mind.</span></p><svg className="about-writing-guide" viewBox="0 0 310 40" aria-hidden="true"><path className="about-pen-path" d="M2 22Q12 2 22 21T42 20T62 22T82 18T102 22T122 20T142 22T162 18T182 22T202 20T222 22T242 18T262 22L280 24"/><path className="about-ink-trail" d="M2 35Q130 29 280 34"/></svg><svg className="about-pen" viewBox="0 0 100 160" aria-hidden="true"><defs><linearGradient id="about-pen-metal"><stop stopColor="#a6824d"/><stop offset=".45" stopColor="#f2dfad"/><stop offset="1" stopColor="#987644"/></linearGradient><linearGradient id="about-pen-barrel"><stop stopColor="#1c3433"/><stop offset=".4" stopColor="#50736b"/><stop offset="1" stopColor="#142727"/></linearGradient></defs><g transform="rotate(30 15 145)"><path d="M15 145 7 121 23 121Z" fill="url(#about-pen-metal)" stroke="#8e754c"/><path d="M15 145V126" stroke="#786442"/><rect x="6" y="27" width="18" height="96" rx="5" fill="url(#about-pen-barrel)"/><path d="M6 113H24M6 43H24" stroke="#d2ba82" strokeWidth="4"/><rect x="5" y="8" width="20" height="35" rx="9" fill="url(#about-pen-barrel)"/><path d="M20 14V51" stroke="#d9c492" strokeWidth="3" strokeLinecap="round"/></g></svg></div><h2>You don’t need to have it all figured out.<br/><span>Just bring your curiosity.</span></h2><svg className="about-underline" viewBox="0 0 440 16" aria-hidden="true"><path d="M4 10Q220 -2 435 7M40 14Q260 4 410 11"/></svg><p className="about-letter-lede">A place to learn something new, make something of your own, and find people to do it with.</p></div>
     <div className="about-letter-fold"><div className="about-letter-copy">
      <section className="about-copy-section"><span className="about-copy-index">01 / WHO WE ARE</span><div><h3>Different interests. Shared curiosity.</h3><p>We’re SSN Coding Club—a community of learners and builders exploring technology together. Some of us are writing our first lines of code. Others are experimenting with new tools or bringing their next project to life. There’s room for both, and everything in between.</p></div></section>
      <section className="about-copy-section"><span className="about-copy-index">02 / WHAT WE DO</span><div><h3>Ideas deserve a place to begin.</h3><p>Through workshops, projects, events and conversations, we make space to try things out. Our verticals let you follow your interests—from building applications and exploring AI to design, cybersecurity, open source and more.</p></div></section>
      <div className="about-letter-values"><div><b>Learn.</b><span>Ask questions.<br/>Share what you discover.</span></div><div><b>Build.</b><span>Experiment with an idea.<br/>Make it real, together.</span></div><div><b>Belong.</b><span>Find collaborators.<br/>Grow at your own pace.</span></div></div>
      <section className="about-copy-section about-copy-invitation"><span className="about-copy-index">03 / YOUR PLACE HERE</span><div><h3>You don’t have to arrive as an expert.</h3><p>Bring a question, a half-formed idea, or simply a willingness to explore. Find a vertical that catches your eye, join a conversation, and take your next step with us.</p></div></section>
      <footer><span>For your next idea,<br/>and the people you’ll meet along the way.</span><strong>See you around,<br/>SSN Coding Club ♡</strong></footer>
     </div></div>
    </article></div>
    <div className="about-envelope about-envelope-exit" aria-hidden="true"><div className="about-envelope-back"/><div className="about-envelope-flap"><div/><div/></div><div className="about-envelope-front"><span>UNTIL YOUR NEXT IDEA.</span><small>SSN CODING CLUB · SEE YOU AROUND</small></div><div className="about-seal">&lt;/&gt;<small>SSN</small></div></div>
   </div>
  </div>
 </div>;
}
