'use client';
import SectionHeadingText from './SectionHeadingText';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import gsap from 'gsap';
import {HeartPulse,Gamepad2,Users,BrainCircuit,ShieldCheck,Layers3,Palette,CalendarDays,GitBranch,MapPinned,ArrowRight,Search,Code2,Globe2,Database,Boxes,ChartNoAxesCombined, X,Trophy,Rocket} from 'lucide-react';
import type {Project} from '../data/projects';
const icons={heart:HeartPulse,gamepad:Gamepad2,users:Users,brain:BrainCircuit,shield:ShieldCheck,layers:Layers3,palette:Palette,calendar:CalendarDays,git:GitBranch,map:MapPinned,trophy:Trophy,rocket:Rocket};
function ProjectIcon({type,size=32}:{type:string,size?:number}){const Icon=icons[type as keyof typeof icons]||Code2;return <Icon size={size} strokeWidth={1.8}/>}
function DoodleArrow({className=''}:{className?:string}){return <svg className={className} viewBox="0 0 125 80" fill="none" aria-hidden="true"><path d="M5 63 C12 8 75 6 106 43" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M90 38 L108 45 L103 27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function Roll({project,index,active,onStart,onMove,onEnd,onAuto}:{project:Project,index:number,active:boolean,onStart:(e:React.PointerEvent<HTMLButtonElement>)=>void,onMove:(e:React.PointerEvent<HTMLButtonElement>)=>void,onEnd:(e:React.PointerEvent<HTMLButtonElement>)=>void,onAuto:()=>void}){return <button type="button" className={`roll ${active?'roll-active':'roll-muted'}`} style={{'--paper':project.color,'--edge':project.dark} as React.CSSProperties} onPointerDown={onStart} onPointerUp={onEnd} onPointerCancel={onEnd} onClick={e=>{if(e.detail<2)onAuto()}} aria-pressed={active} aria-label={`${active?"Roll up":"Unroll"} ${project.name} project`}><span className="roll-shadow"/><span className="roll-body"><span className="roll-ridges"/><span className="roll-label"><span className="roll-index">{String(index+1).padStart(2,'0')}.</span><span className="roll-name">{project.name}</span></span><span className="roll-icon"><ProjectIcon type={project.icon} size={27}/></span></span><span className="roll-cap roll-cap-left"><span className="roll-spiral"/></span><span className="roll-cap roll-cap-right"><span className="roll-spiral"/></span><span className="roll-rope"><span className="rope-strand"/><span className="rope-loop rope-loop-left"/><span className="rope-loop rope-loop-right"/><span className="rope-tail rope-tail-left"/><span className="rope-tail rope-tail-right"/></span></button>}
function Paper({project,index,onClose}:{project:Project,index:number,onClose:()=>void}){return <div className="paper" style={{'--paper':project.color,'--edge':project.dark} as React.CSSProperties}><div className="paper-grain"/><svg className="paper-top" viewBox="0 0 1000 85" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="topCurl" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff" stopOpacity=".52"/><stop offset=".26" stopColor="#fff" stopOpacity=".2"/><stop offset=".62" stopColor="#000" stopOpacity=".12"/><stop offset="1" stopColor="#000" stopOpacity="0"/></linearGradient></defs><path d="M0 6 Q110 -7 240 7 Q390 18 500 7 Q670 -4 810 6 Q920 -6 1000 8 L1000 78 Q900 59 800 69 Q500 84 230 69 Q100 58 0 78 Z" fill="url(#topCurl)"/><path d="M0 8 Q120 -4 240 8 Q400 18 500 8 Q700 -3 1000 9" fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth="2"/></svg><svg className="paper-bottom" viewBox="0 0 1000 85" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="bottomCurl" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#000" stopOpacity="0"/><stop offset=".38" stopColor="#000" stopOpacity=".1"/><stop offset=".72" stopColor="#fff" stopOpacity=".23"/><stop offset="1" stopColor="#fff" stopOpacity=".55"/></linearGradient></defs><path d="M0 6 Q100 27 240 13 Q510 -3 750 13 Q890 27 1000 6 L1000 75 Q860 88 740 75 Q500 62 260 75 Q120 88 0 74 Z" fill="url(#bottomCurl)"/><path d="M0 73 Q120 84 260 74 Q500 61 740 74 Q890 85 1000 73" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2"/></svg><svg className="paper-corner corner-tl" viewBox="0 0 105 90" aria-hidden="true"><path d="M0 0 H105 Q47 8 25 40 Q8 64 0 90Z" fill="var(--edge)" opacity=".23"/><path d="M0 0 H105 Q39 12 0 90 Q12 37 0 0" fill="#fff" opacity=".43"/><path d="M11 72 Q34 21 93 8" stroke="var(--edge)" strokeWidth="1.5" fill="none" opacity=".5"/></svg><svg className="paper-corner corner-tr" viewBox="0 0 105 90" aria-hidden="true"><path d="M0 0 H105 V90 Q91 64 80 40 Q58 8 0 0" fill="var(--edge)" opacity=".23"/><path d="M0 0 H105 V90 Q66 12 0 0" fill="#fff" opacity=".43"/><path d="M12 8 Q72 21 94 72" stroke="var(--edge)" strokeWidth="1.5" fill="none" opacity=".5"/></svg><span className="paper-tape"/><div className="paper-inner"><div className="paper-header"><span className="paper-number">{String(index+1).padStart(2,'0')}.</span><div className="paper-title-wrap"><h3>{project.name}</h3><p>{project.tag}</p></div><ProjectIcon type={project.icon} size={44}/></div><p className="paper-description">{project.desc}</p><div className="paper-main"><div><span className="highlight">KEY FEATURES</span><ul className="feature-list">{project.features.map((feature,i)=><li key={feature}><span>{[<CalendarDays key="a"/>,<Gamepad2 key="b"/>,<Users key="c"/>,<ChartNoAxesCombined key="d"/>][i%4]}</span>{feature}</li>)}</ul></div><div className="project-preview"><div className="preview-bar"><span>○ ○ ○</span><span>{project.name} / preview</span></div><div className="preview-center"><ProjectIcon type={project.icon} size={34}/><span>{project.tag}</span></div><div className="preview-lines"><i/><i/><i/></div>{project.url?<a href={project.url} target="_blank" rel="noopener noreferrer" className="preview-button">Explore project ↗</a>:<span className="preview-button preview-placeholder">Project preview</span>}<div className="preview-note">{project.note}<span>↗</span></div></div></div><div className="stack-area"><span className="highlight">TECH STACK</span><div className="stack-grid">{project.stack.map((tech,i)=><div key={tech}><span className="stack-icon">{[<Code2 key="a"/>,<Globe2 key="b"/>,<Database key="c"/>,<Boxes key="d"/>][i%4]}</span><span>{tech}</span></div>)}</div></div></div><button className="roll-back" type="button" onClick={onClose}>↶ roll back</button></div>}
export default function Projects({projects,heading='RECENT PROJECTS'}:{projects:Project[],heading?:string}){
 const [selected,setSelected]=useState<string|null>(null);
 const [query,setQuery]=useState('');
 const stage=useRef<HTMLDivElement>(null);
 const root=useRef<HTMLElement>(null);
 const selectedRef=useRef<string|null>(null);
 const progress=useRef({value:0});
 const animation=useRef<gsap.core.Tween|null>(null);
 const transfer=useRef<gsap.core.Timeline|null>(null);
 const flyingRoll=useRef<HTMLElement|null>(null);
 const drag=useRef<{pointer:number;y:number;start:number;distance:number}|null>(null);
 const pending=useRef(0);
 const switching=useRef(false);
 const queued=useRef<string|null>(null);
 const suppressClick=useRef(false);
 const filtered=projects.filter(p=>`${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
 const activeProject=projects.find(p=>p.id===selected);
 const activeIndex=projects.findIndex(p=>p.id===selected);
 const sync=()=>{
  const p=progress.current.value,el=stage.current;if(!el)return;
  el.dataset.unrollProgress=String(p);
  const reveal=el.querySelector<HTMLElement>('.paper-reveal');
  const traveler=el.querySelector<HTMLElement>('.travel-roll');
  const sheetProgress=p;
  if(reveal)reveal.style.clipPath=`inset(0 0 ${100-sheetProgress*100}% 0)`;
  if(traveler){traveler.style.top=`calc(${sheetProgress*100}% - ${19+19*sheetProgress}px)`;traveler.style.opacity='1';traveler.style.pointerEvents='auto'}

 };
 useLayoutEffect(()=>{const shell=stage.current?.querySelector('.paper-animation-shell');if(shell)gsap.set(shell,{clearProps:'transform,transformOrigin'});sync()},[selected]);
 useEffect(()=>()=>{animation.current?.kill();transfer.current?.kill();flyingRoll.current?.remove();cancelAnimationFrame(pending.current)},[]);
 const arrive=(id:string)=>{
  if(selectedRef.current===id)return;
  animation.current?.kill();transfer.current?.kill();flyingRoll.current?.remove();
  root.current?.querySelectorAll<HTMLElement>('.roll-scroll .roll-rope,.roll-scroll .rope-loop,.roll-scroll .rope-tail').forEach(el=>gsap.set(el,{clearProps:'all'}));
  selectedRef.current=id;progress.current.value=0;
  const source=root.current?.querySelector<HTMLElement>(`[data-project-id="${id}"] .roll`),destination=stage.current;
  if(!source||!destination){setSelected(id);return}
  const from=source.getBoundingClientRect(),to=destination.getBoundingClientRect();
  const rope=source.querySelector<HTMLElement>('.roll-rope');
  const project=projects.find(project=>project.id===id)!;
  // Use the actual unrolling cylinder throughout the flight and at rest.
  const clone=document.createElement('div');
  clone.setAttribute('aria-hidden','true');clone.inert=true;
  clone.style.setProperty('--paper',project.color);clone.style.setProperty('--edge',project.dark);
  clone.innerHTML='<div class="travel-roll"><span class="travel-roll-surface"></span><span class="travel-roll-highlight"></span><span class="travel-roll-spiral"></span></div>';
  Object.assign(clone.style,{position:'absolute',left:(from.left-to.left)+'px',top:(from.top+from.height/2-to.top)+'px',width:from.width+'px',height:'38px',margin:'0',zIndex:'40',pointerEvents:'none',opacity:'0'});
  const ruler=document.createElement('div');ruler.className='paper-animation-shell';
  Object.assign(ruler.style,{position:'absolute',left:'50%',transform:'translateX(-50%)',top:getComputedStyle(destination).paddingTop,height:'0',minHeight:'0',pointerEvents:'none'});
  destination.appendChild(ruler);const landing=ruler.getBoundingClientRect();ruler.remove();
  destination.appendChild(clone);flyingRoll.current=clone;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timeline=gsap.timeline({onComplete:()=>{
   setSelected(id);requestAnimationFrame(()=>{clone.remove();if(flyingRoll.current===clone)flyingRoll.current=null;switching.current=false;const next=queued.current;queued.current=null;if(next&&next!==id)select(next);else auto(id)});
  }});transfer.current=timeline;
  if(rope){
   timeline.to(rope.querySelectorAll('.rope-loop'),{x:(i:number)=>i===0?-20:20,rotation:(i:number)=>i===0?-40:40,duration:reduced?0:.22,ease:'power2.out'});
   timeline.to(rope.querySelectorAll('.rope-tail'),{y:20,rotation:(i:number)=>i===0?-25:25,duration:reduced?0:.18},'<');
   timeline.to(rope,{x:70,y:35,rotation:35,opacity:0,duration:reduced?0:.22},'>-.04');
  }
  timeline.set(source,{visibility:'hidden'}).set(clone,{opacity:1}).to(clone,{left:landing.left-to.left,top:landing.top-to.top,width:landing.width,duration:reduced?0:.5,ease:'power2.inOut'});
 };
 const select=(id:string)=>{
  if(switching.current){queued.current=id;return}
  if(selectedRef.current===id)return;
  switching.current=true;
  const previous=selectedRef.current;
  const shell=stage.current?.querySelector<HTMLElement>('.paper-animation-shell');
  if(!previous||!shell){arrive(id);return}
  animation.current?.kill();drag.current=null;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timeline=gsap.timeline({onComplete:()=>{
   const returned=root.current?.querySelector<HTMLElement>(`[data-project-id="${previous}"] .roll`);
   if(returned)gsap.set(returned,{visibility:'visible'});
   selectedRef.current=null;setSelected(null);arrive(id);
  }});transfer.current=timeline;
  timeline.to(progress.current,{value:0,duration:reduced?0:.45,ease:'power2.inOut',onUpdate:sync});
  timeline.add(()=>{
   const source=root.current?.querySelector<HTMLElement>(`[data-project-id="${previous}"] .roll`);
   const from=shell.getBoundingClientRect(),to=source?.getBoundingClientRect();
   if(to)timeline.to(shell,{x:to.left-from.left,y:to.top+to.height/2-from.top,scaleX:to.width/from.width,transformOrigin:'left top',duration:reduced?0:.45,ease:'power2.inOut'});
  });
 };
 const auto=(id:string)=>{
  if(switching.current)return;
  animation.current?.kill();select(id);
  const target=progress.current.value>.995?0:1;
  animation.current=gsap.to(progress.current,{value:target,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:1,ease:'power2.inOut',onUpdate:sync});
 };
 const start=(e:React.PointerEvent<HTMLButtonElement>,id:string)=>{
  if(e.button!==0||switching.current)return;
  e.preventDefault();
  suppressClick.current=false;
  if(switching.current)return;
  animation.current?.kill();select(id);
  e.currentTarget.setPointerCapture(e.pointerId);
  drag.current={pointer:e.pointerId,y:e.clientY,start:progress.current.value,distance:Math.max(180,Math.min(400,window.innerHeight*.5))};
 };
 const move=(e:React.PointerEvent<HTMLButtonElement>)=>{
  const d=drag.current;if(!d||d.pointer!==e.pointerId)return;
  if(Math.abs(e.clientY-d.y)>5)suppressClick.current=true;
  progress.current.value=Math.max(0,Math.min(1,d.start+(e.clientY-d.y)/d.distance));
  cancelAnimationFrame(pending.current);pending.current=requestAnimationFrame(sync);
 };
 const end=(e:React.PointerEvent<HTMLButtonElement>)=>{
  if(drag.current?.pointer!==e.pointerId)return;
  drag.current=null;cancelAnimationFrame(pending.current);sync();
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 };
 const clickAuto=(id:string)=>{if(suppressClick.current){suppressClick.current=false;return}auto(id)};
 const close=()=>{
  if(switching.current)return;
  animation.current?.kill();
  animation.current=gsap.to(progress.current,{value:0,duration:.4,ease:'power2.inOut',onUpdate:sync});
 };
 return <section className="projects-section" id="projects" ref={root}><div className="section-gutter"><div className="terminal-command">ssn@codingclub:~$ <b>projects</b><span className="project-caret">▌</span></div><div className="section-heading"><h2><span>//</span> <SectionHeadingText text={heading}/></h2><div className="heading-note">ideas<br/>code<br/>impact <DoodleArrow/></div><p>Projects that turned<br/>ideas into reality.</p></div><div className="projects-grid"><div className="roll-column"><div className="search-row"><Search size={15}/><input aria-label="Find a project" placeholder="find a project..." value={query} onChange={e=>setQuery(e.target.value)}/><span>{filtered.length} / {projects.length}</span></div><div className="roll-scroll">{filtered.map(p=><div key={p.id} data-project-id={p.id}><Roll project={p} index={projects.indexOf(p)} active={selected===p.id} onStart={()=>{}} onMove={()=>{}} onEnd={()=>{}} onAuto={()=>selected===p.id?auto(p.id):select(p.id)}/></div>)}{filtered.length===0&&<p>No matching projects.</p>}</div><div className="scroll-hint">⌄ scroll to explore all projects ⌄</div></div><div className="paper-stage" ref={stage}>{activeProject?<div className="paper-animation-shell" style={{'--paper':activeProject.color,'--edge':activeProject.dark} as React.CSSProperties}><div className="paper-reveal" onClick={e=>{const target=e.target as HTMLElement;if(!target.closest('a,button'))auto(activeProject.id)}}><Paper key={activeProject.id} project={activeProject} index={activeIndex} onClose={close}/></div><button type="button" className="travel-roll" aria-label={`Unroll ${activeProject.name} chart`} onPointerDown={e=>start(e,activeProject.id)} onPointerMove={move} onPointerUp={end} onPointerCancel={end}  onClick={e=>{if(e.detail<2)clickAuto(activeProject.id)}}><span className="travel-roll-surface"/><span className="travel-roll-highlight"/><span className="travel-roll-spiral"/></button></div>:null}{activeProject&&<p className="chart-instruction">Click the chart to roll up / unroll · or drag the roller</p>}</div></div></div></section>
}
