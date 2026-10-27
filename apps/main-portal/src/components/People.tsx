'use client';
import SectionHeadingText from './SectionHeadingText';
import {useEffect,useRef,useState} from 'react';

import {Code2,BrainCircuit,ShieldCheck,Glasses,Palette,Megaphone,GitFork,Crown,ArrowUpRight,Heart,Star,Paperclip,MoveUpRight,Menu,X,Trophy,Rocket} from 'lucide-react';
import {officeBearers,teams,type Team,type Member} from '../data/people';
const icons={code:Code2,brain:BrainCircuit,shield:ShieldCheck,vr:Glasses,palette:Palette,megaphone:Megaphone,git:GitFork,crown:Crown,trophy:Trophy,rocket:Rocket};
function Photo({person,index,x,width,onStart,dragging}:{person:Member;index:number;x:number;width:number;onStart:(e:React.PointerEvent<HTMLElement>,index:number)=>void;dragging:boolean}){
 const [failed,setFailed]=useState(false);
 return <article className="people-polaroid people-draggable" data-dragging={dragging} onPointerDown={e=>onStart(e,index)} style={{left:x,width, '--twist':`${[-3,2,-2,3,-1][index%5]}deg`} as React.CSSProperties} aria-label={`${person.name}, ${person.role}. Drag sideways along the string.`}>
 <span className="people-clip" aria-hidden="true"><i/><i/></span>
 <div className="people-photo">{!failed?<img src={person.photo} alt={`Placeholder portrait for ${person.name}`} draggable={false} loading="lazy" onError={()=>setFailed(true)}/>:<span className="people-fallback">{person.name.slice(0,1)}</span>}</div>
 <div className="people-caption"><strong>{person.name}</strong><span>{person.role}</span></div></article>
}
function HangingPhotos({members,rowIndex}:{members:Member[];rowIndex:number}){
 const track=useRef<HTMLDivElement>(null);
 const [trackWidth,setTrackWidth]=useState(900);
 const [positions,setPositions]=useState<number[]>([]);
 const positionsRef=useRef<number[]>([]);
 const drag=useRef<{index:number;pointer:number;startX:number;original:number}|null>(null);
 const [active,setActive]=useState<number|null>(null);
 const count=members.length;
 const cardWidth=Math.max(112,Math.min(168,(trackWidth-76)/Math.max(count,1)-12));
 const padding=20;
 const maxX=Math.max(padding,trackWidth-padding-cardWidth);
 const initial=(i:number)=>padding+(count===1?0:i*(maxX-padding)/(count-1));
 useEffect(()=>{const el=track.current;if(!el)return;const obs=new ResizeObserver(()=>setTrackWidth(el.clientWidth));obs.observe(el);setTrackWidth(el.clientWidth);return()=>obs.disconnect()},[]);
 useEffect(()=>{const next=members.map((_,i)=>initial(i));positionsRef.current=next;setPositions(next)},[trackWidth,members]);
 const onStart=(e:React.PointerEvent<HTMLElement>,index:number)=>{
  if(e.button!==0||window.matchMedia('(max-width:1099px)').matches)return;
  e.preventDefault();e.stopPropagation();
  e.currentTarget.setPointerCapture(e.pointerId);
  drag.current={index,pointer:e.pointerId,startX:e.clientX,original:positionsRef.current[index]??initial(index)};
  setActive(index);
 };
 const onMove=(e:React.PointerEvent<HTMLDivElement>)=>{
  const d=drag.current;if(!d||e.pointerId!==d.pointer)return;
  const xs=positionsRef.current;
  const min=d.index===0?padding:xs[d.index-1]+cardWidth+7;
  const max=d.index===count-1?maxX:xs[d.index+1]-cardWidth-7;
  const desired=d.original+e.clientX-d.startX;
  const next=Math.min(Math.max(desired,min),Math.max(min,max));
  if(Math.abs(next-xs[d.index])>.15){const updated=[...xs];updated[d.index]=next;positionsRef.current=updated;setPositions(updated)}
 };
 const onEnd=(e:React.PointerEvent<HTMLDivElement>)=>{
  if(!drag.current||e.pointerId!==drag.current.pointer)return;
  drag.current=null;setActive(null);
  const node=e.target as HTMLElement;
  const captured=node.closest('.people-polaroid') as HTMLElement|null;
  if(captured?.hasPointerCapture(e.pointerId))captured.releasePointerCapture(e.pointerId);
 };
 return <div className="people-photo-row people-free-track" ref={track} onPointerMove={onMove} onPointerUp={onEnd} onPointerCancel={onEnd}>
 {members.map((person,i)=><Photo key={person.id} person={person} index={i} x={positions[i]??initial(i)} width={cardWidth} onStart={onStart} dragging={active===i}/>)}
 </div>
}
function Garland({index,color}:{index:number;color:string}){return <div className="people-garland" aria-hidden="true"><svg viewBox="0 0 1200 95" preserveAspectRatio="none"><path d="M0 22 Q300 91 600 45 T1200 22" fill="none" stroke="#806143" strokeWidth="3"/><path d="M0 19 Q300 88 600 42 T1200 19" fill="none" stroke="#b79b72" strokeWidth="1"/></svg>{Array.from({length:13},(_,i)=><span className="people-bulb" key={i} style={{left:`${i*8.1+1}%`,top:`${((i*8.1+1)/100*1200 <= 600 ? (Math.pow(1-(i*8.1+1)/50,2)*22 + 2*(1-(i*8.1+1)/50)*((i*8.1+1)/50)*91 + Math.pow((i*8.1+1)/50,2)*45) : (Math.pow(1-((i*8.1+1)/100*1200-600)/600,2)*45 + 2*(1-((i*8.1+1)/100*1200-600)/600)*(((i*8.1+1)/100*1200-600)/600)*(-1) + Math.pow(((i*8.1+1)/100*1200-600)/600,2)*22))/95*100}%`, '--bulb-delay':`${((i*7+index*3)%13)*-.37}s`, '--bulb-duration':`${2.1+((i*5+index)%7)*.33}s`, '--light-color':color} as React.CSSProperties}/>)}</div>}
function Doodle({type}:{type:'plane'|'arrow'|'star'|'heart'|'spark'}){if(type==='plane')return <svg viewBox="0 0 140 115" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 45 127 8 87 103 64 64 15 45Z M64 64 127 8 M64 64 49 91 87 103"/><path d="M6 80 Q18 105 42 100" strokeDasharray="6 9"/></svg>;if(type==='arrow')return <svg viewBox="0 0 130 110" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M8 10 Q7 100 95 69 Q120 61 113 27 M92 37 113 22 126 44"/></svg>;if(type==='heart')return <Heart/>;if(type==='spark')return <span>✳</span>;return <Star/>}
function TeamRow({team,index}:{team:Team;index:number}){const [perRow,setPerRow]=useState(4);useEffect(()=>{const mq=window.matchMedia('(max-width: 1099px)');const update=()=>setPerRow(mq.matches?999:4);update();mq.addEventListener('change',update);return()=>mq.removeEventListener('change',update)},[]);const Icon=icons[team.icon as keyof typeof icons]||Code2;return <section className="people-team" id={team.id} aria-label={`${team.name} team`}><div className="people-team-label"><div className="people-label-paper" style={{'--team-color':team.color} as React.CSSProperties}><span className="people-label-tape"/><div className="people-label-name"><strong>{team.name}</strong><Icon size={38} strokeWidth={2}/></div><div className="people-label-underline"/></div><p>{team.tagline}</p><Doodle type="arrow"/></div><div className="people-team-members"><div className="people-member-strings">{Array.from({length:Math.ceil(team.members.length/perRow)},(_,row)=><div className="people-string-row" key={row} style={{'--member-count':Math.min(perRow,team.members.length-row*perRow)} as React.CSSProperties}><Garland index={index*3+row} color={team.color}/><HangingPhotos members={team.members.slice(row*perRow,row*perRow+perRow)} rowIndex={row}/></div>)}</div></div></section>}
export default function People(){const [menuOpen,setMenuOpen]=useState(false);const [lightsOn,setLightsOn]=useState(true);const [query,setQuery]=useState('');const [selected,setSelected]=useState('all');const allTeams=[officeBearers,...teams];const visibleTeams=allTeams.filter(t=>(selected==='all'||t.id===selected)&&t.name.toLowerCase().includes(query.toLowerCase()));const root=useRef<HTMLElement>(null);useEffect(()=>{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.13});root.current?.querySelectorAll('.people-team').forEach(el=>observer.observe(el));return()=>observer.disconnect()},[]);return <main id="top" className="people-page" data-lights={lightsOn ? "on" : "off"} ref={root}><div className="people-board"><div className="people-heading"><div className="people-heading-grid"><h1><em>//</em> <SectionHeadingText text="OUR PEOPLE"/></h1><div className="people-handwritten">Different people,<br/>same curiosity.<span className="pink-burst">✳</span></div><p>The people behind the projects,<br/>events and ideas — a team of<br/>learners, builders and dreamers.</p></div></div><div className="people-decoration people-deco-star"><Doodle type="star"/></div><div className="people-decoration people-deco-heart"><Doodle type="heart"/></div><div className="people-leaves left" aria-hidden="true"><i/><i/><i/><i/><i/></div><div className="people-search-panel"><label htmlFor="team-search">Find a vertical <span>↗</span></label><div className="people-search-controls"><input id="team-search" type="search" placeholder="Search Full Stack, AI / ML, Design..." value={query} onChange={e=>{setQuery(e.target.value);setSelected('all')}}/><select aria-label="Filter by vertical" value={selected} onChange={e=>{setSelected(e.target.value);setQuery('')}}><option value="all">All teams</option>{allTeams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select>{(query||selected!=='all')&&<button type="button" onClick={()=>{setQuery('');setSelected('all')}}>Clear ×</button>}</div><button type="button" className="people-lights-toggle" aria-pressed={lightsOn} onClick={()=>setLightsOn(v=>!v)}>{lightsOn ? "✦ Fairy lights: ON" : "✧ Fairy lights: OFF"}</button><div className="people-search-hint">{visibleTeams.length} {visibleTeams.length===1?'section':'sections'} · drag a portrait sideways along its string</div></div><div id="teams" className="people-team-list">{visibleTeams.map((team,i)=><TeamRow team={team} key={team.id} index={i}/>)}</div></div></main>}
