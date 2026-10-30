'use client';
import SectionHeadingText from './SectionHeadingText';
import {useEffect,useMemo,useRef,useState} from 'react';
import {gsap} from 'gsap';
import usePageScrub from './usePageScrub';
import {ArrowRight,ArrowUpRight,CalendarDays,ChevronLeft,ChevronRight,Clock3,MapPin,Search,Star, X,BookOpen,Lightbulb,MousePointer2, Globe2, Laptop2, Code2, PencilRuler, Sparkles, Filter, RotateCcw} from 'lucide-react';
import type {ClubEvent} from '../data/events';
const dateText=(date:string)=>new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'2-digit'}).toUpperCase();
const monthText=(date:string)=>new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{month:'long',year:'numeric'}).toUpperCase();
const colors:Record<string,string>={Workshop:'#f59abf',Talk:'#83d9b0',Design:'#bb8beb',Hackathon:'#ffb16c',Competition:'#a9a0ed',Community:'#ffd36d'};
const EVENT_BOOK_HINT = 'CLICK A BOOK FOR DETAILS';
function EventBookHint({month}:{month:string}){
 const [typed,setTyped]=useState(0);
 useEffect(()=>{
   setTyped(0);
   let current=0;
   const timer=window.setInterval(()=>{
     current+=1;
     setTyped(current);
     if(current>=EVENT_BOOK_HINT.length)window.clearInterval(timer);
   },65);
   return ()=>window.clearInterval(timer);
 },[month]);
 const finished=typed>=EVENT_BOOK_HINT.length;
 return <span className={`calendar-book-hint ${finished?'calendar-book-hint-finished':''}`}>
   <span className="calendar-book-hint-label"><span className="calendar-book-hint-text">{EVENT_BOOK_HINT.slice(0,typed)}<span className="calendar-book-hint-caret" aria-hidden="true"/></span></span>
   <svg className="calendar-book-hint-arrow" viewBox="0 0 102 72" aria-hidden="true" fill="none"><path d="M96 3 C77 7 73 24 58 30 S30 35 8 66" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><path d="M8 66 L12 47 M8 66 L28 61" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
 </span>;
}
export default function EventsBooks({events,heading="UPCOMING EVENTS"}:{events:ClubEvent[];heading?:string}){
 const [visibleMonth,setVisibleMonth]=useState(''),[active,setActive]=useState<string|null>(null),[month,setMonth]=useState<string>('all'),[query,setQuery]=useState(''),[opening,setOpening]=useState(false);
 const overlay=useRef<HTMLDivElement>(null),book=useRef<HTMLDivElement>(null),cover=useRef<HTMLDivElement>(null),spread=useRef<HTMLDivElement>(null),animation=useRef<gsap.core.Timeline|null>(null);
 const months=useMemo(()=>Array.from(new Set(events.map(e=>e.date.slice(0,7)))).sort(),[events]);
 const filtered=useMemo(()=>events.filter(e=>(month==='all'||e.date.startsWith(month))&&`${e.title} ${e.type} ${e.vertical}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.date.localeCompare(b.date)),[events,month,query]);
 const selected=events.find(e=>e.id===active);
 const opened=useRef(false);
 const calendarDates=useMemo(()=>{
   const shownMonths=month==='all'?months:[month];
   return shownMonths.flatMap(m=>{
     const [y,mo]=m.split('-').map(Number);
     const days=new Date(y,mo,0).getDate();
     return Array.from({length:days},(_,i)=>`${m}-${String(i+1).padStart(2,'0')}`);
   });
 },[month,months]);
 const byDate=useMemo(()=>{
   const result:Record<string,ClubEvent[]>={};
   for(const event of filtered)(result[event.date]??=[]).push(event);
   return result;
 },[filtered]);
 const calendarRef=useRef<HTMLDivElement>(null);
 // Use one wheel event for one proportional horizontal movement; avoid large jumps
 // caused by browser scroll chaining / discrete wheel steps.
 useEffect(()=>{
  const el=calendarRef.current;if(!el)return;
  const wheel=(event:WheelEvent)=>{
   if(event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
   if(el.scrollWidth<=el.clientWidth+2)return;
   const movement=Math.sign(event.deltaY)*Math.min(75,Math.abs(event.deltaY)*(event.deltaMode===1?14:1));
   const next=Math.max(0,Math.min(el.scrollWidth-el.clientWidth,el.scrollLeft+movement));
   if(Math.abs(next-el.scrollLeft)<.5)return;
   event.preventDefault();el.scrollLeft=next;
  };
  el.addEventListener('wheel',wheel,{passive:false});
  return()=>el.removeEventListener('wheel',wheel);
 },[month,calendarDates]);
 useEffect(()=>{const el=calendarRef.current;if(!el)return;setVisibleMonth(month==='all'?(months[0]||''):month);const frame=requestAnimationFrame(()=>{const first=el.querySelector<HTMLElement>('.date-column.has-event');if(first){const left=first.getBoundingClientRect().left-el.getBoundingClientRect().left+el.scrollLeft-el.clientWidth*.2;el.scrollTo({left:Math.max(0,left),behavior:'instant'})}else el.scrollTo({left:0,behavior:'instant'})});return()=>cancelAnimationFrame(frame)},[month,months,filtered]);
 useEffect(()=>{const el=calendarRef.current;if(!el)return;const onScroll=()=>{const columns=el.querySelectorAll<HTMLElement>('.date-column');const index=Math.min(columns.length-1,Math.max(0,Math.floor((el.scrollLeft+el.clientWidth*.42)/(columns[0]?.offsetWidth||95))));const d=columns[index]?.dataset.date;if(d)setVisibleMonth(d.slice(0,7));};el.addEventListener('scroll',onScroll,{passive:true});onScroll();return()=>el.removeEventListener('scroll',onScroll)},[month,calendarDates]);
 useEffect(()=>{if(!active||opened.current||!overlay.current||!book.current||!cover.current||!spread.current)return;opened.current=true; const root=overlay.current,b=book.current,c=cover.current,s=spread.current;
 gsap.set(root,{autoAlpha:0});gsap.set(b,{y:110,scale:.77,rotate:-5});gsap.set(c,{rotationY:0,autoAlpha:1,transformOrigin:'left center'});gsap.set(s,{autoAlpha:0,y:12});
 const tl=gsap.timeline({onComplete:()=>setOpening(false)});animation.current=tl;tl.to(root,{autoAlpha:1,duration:.18}).to(b,{y:0,scale:1,rotate:0,duration:.42,ease:'back.out(1.25)'},0).to(c,{rotationY:-162,duration:.6,ease:'power3.inOut'},.18).to(s,{autoAlpha:1,y:0,duration:.24,ease:'power2.out'},.48).set(c,{autoAlpha:0});
 return()=>{tl.kill()};},[active]);
 const open=(id:string)=>{if(opening||active)return;setOpening(true);setActive(id)};
 const close=()=>{if(!overlay.current||!book.current||!cover.current||!spread.current||opening)return;setOpening(true);animation.current?.kill();gsap.set(cover.current,{autoAlpha:1});gsap.timeline({onComplete:()=>{opened.current=false;setActive(null);setOpening(false)}}).to(spread.current,{autoAlpha:0,y:8,duration:.2}).to(cover.current,{rotationY:0,duration:.52,ease:'power2.inOut'},0).to(book.current,{scale:.8,y:70,duration:.42,ease:'power2.in'},.25).to(overlay.current,{autoAlpha:0,duration:.22},.52)};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&active&&!opening)close()};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[active,opening]);
 useEffect(()=>{
  if(!active)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous};
 },[Boolean(active)]);
 // Vertical gestures navigate the page; horizontal gestures browse the calendar.
 const [turnBase,setTurnBase]=useState(0);
 const [pageTurning,setPageTurning]=useState(false);
 const eventSheet=useRef<HTMLDivElement>(null);
 usePageScrub({surface:overlay,sheet:eventSheet,count:filtered.length,enabled:Boolean(active)&&!opening,initial:Math.max(0,filtered.findIndex(event=>event.id===active)),resetKey:month+'|'+query,onIndex:index=>{const event=filtered[index];if(event)setActive(event.id)},onBase:setTurnBase,commitAtEnd:true,onPhase:setPageTurning});
 return <main className="events-page">
 
 <section className="events-board" id="events"><div className="board-top"><span>ssn@codingclub:~$ <b>events</b><span className="cursor">▌</span></span></div>
 <div className="intro"><div><div className="heading-line"><span className="slashes">//</span><h1><SectionHeadingText text={heading}/></h1></div></div></div>

 <div className="decor-illustration decor-globe"><Globe2/><span>ideas without<br/>borders</span></div>
 <div className="decor-illustration decor-laptop"><Laptop2/><span>build something<br/>worth sharing ↗</span></div>
 
 

 <div className="shelf-heading" id="shelf"><span>01 / THE EVENT CALENDAR</span></div>
 <section className="date-library" id="calendar" aria-label="Calendar of events">
 <div className="calendar-month-banner"><div className="calendar-month-topline"><span>NOW EXPLORING</span><strong key={visibleMonth} className="heading-type-reveal">{visibleMonth?monthText(visibleMonth+'-01'):'ALL EVENTS'}</strong><span className="events-scroll-months-note">← scroll to explore more months →</span></div><EventBookHint month={visibleMonth}/></div>
 <div className="date-scroll"  ref={calendarRef}><div className="date-columns">{calendarDates.map((day,i)=>{const dayEvents=byDate[day]||[];const dayNumber=Number(day.slice(-2));const monthShort=new Date(`${day}T12:00:00`).toLocaleDateString('en-US',{month:'short'}).toUpperCase();const isFirst=dayNumber===1;return <div data-date={day} className={`date-column ${dayEvents.length?'has-event':''}`} key={day}><div className="calendar-book-slot">{dayEvents.map((event,j)=><button key={event.id} className="calendar-spine" onClick={()=>open(event.id)} style={{'--spine':event.accent,'--tilt':`${[-1.2,.8,-.5,1.3][(i+j)%4]}deg`,'--book-height':`${[305,325,295,318][(i+j)%4]}px`} as React.CSSProperties} aria-label={`Open ${event.title} on ${dateText(event.date)}`}><span className="spine-top">SSN / {String(events.indexOf(event)+1).padStart(2,'0')}</span><span className="spine-title">{event.title}</span><span className="spine-band">{event.type}</span><span className="spine-date">{dateText(event.date)}</span><span className="spine-dots">· · · · ·</span></button>)}</div><div className="date-axis"><span className={`date-tick ${dayEvents.length?'event-tick':''}`} style={{'--tick':dayEvents[0]?.accent||'#9c8a74'} as React.CSSProperties}/><span className="day-number">{String(dayNumber).padStart(2,'0')}</span>{(isFirst||dayEvents.length>0)&&<span className="day-month">{monthShort}</span>}</div></div>})}</div></div></section>
 <section className="calendar-tools" aria-label="Calendar controls">
 <div className="tools-heading"><div><span className="section-kicker">02 / YOUR EVENT DESK</span><h2 className="heading-type-reveal">FIND YOUR NEXT <em>THING.</em></h2><p>Flip through months, look up an event, or follow the colour-coded dates.</p></div></div>
 <div className="tools-grid">
 <div className="tool-block"><label className="tool-label" htmlFor="month-select"><CalendarDays size={17}/> BROWSE MONTHS</label><div className="month-selector"><button aria-label="Previous month" disabled={!months.length||month===months[0]} onClick={()=>setMonth(current=>current==='all'?months[0]:months[Math.max(0,months.indexOf(current)-1)])}><ChevronLeft size={21}/></button><select id="month-select" value={month} onChange={e=>setMonth(e.target.value)}><option value="all">ALL MONTHS</option>{months.map(m=><option key={m} value={m}>{monthText(m+'-01')}</option>)}</select><button aria-label="Next month" disabled={!months.length||month===months[months.length-1]} onClick={()=>setMonth(current=>current==='all'?months[0]:months[Math.min(months.length-1,months.indexOf(current)+1)])}><ChevronRight size={21}/></button></div><div className="month-chips"><button className={month==='all'?'selected':''} onClick={()=>setMonth('all')}>ALL</button>{months.map(m=><button key={m} className={month===m?'selected':''} onClick={()=>setMonth(m)}>{new Date(m+'-01T12:00:00').toLocaleDateString('en-US',{month:'short',year:'2-digit'}).toUpperCase()}</button>)}</div></div>
 <div className="tool-block"><label className="tool-label" htmlFor="event-search"><Search size={17}/> SEARCH THE ARCHIVE</label><div className="prominent-search"><Search size={22}/><input id="event-search" placeholder="Try hackathon, design, AI..." value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={18}/></button>}</div><p className="search-result">{filtered.length} matching event{filtered.length===1?'':'s'}</p></div>
 </div>
 <div className="tools-bottom"><div className="category-legend">{Object.entries(colors).map(([type,color])=><span key={type}><i style={{background:color}}/>{type}</span>)}</div><button className="reset-filters" onClick={()=>{setMonth('all');setQuery('')}}><RotateCcw size={15}/> RESET FILTERS</button></div>
 </section>
 
 </section>
 {selected&&<div className="book-overlay" ref={overlay} role="dialog" aria-modal="true" aria-label={selected.title}><button className="overlay-backdrop" onClick={close} aria-label="Close event details"/><button className="close-book" onClick={close} aria-label="Close book"><X size={21}/></button><div className="open-book" ref={book} style={{'--accent':selected.accent} as React.CSSProperties}><div className="book-depth"/><div className="book-inner"><div className="book-spread" ref={spread}><BookPages event={selected} rightEvent={pageTurning?filtered[Math.min(turnBase+1,filtered.length-1)]:selected}/></div><div className="event-turn-sheet" ref={eventSheet} aria-hidden="true" inert><div className="event-turn-face event-turn-front"><BookPages event={filtered[turnBase]||selected}/></div><div className="event-turn-face event-turn-back"><BookPages event={filtered[Math.min(turnBase+1,filtered.length-1)]||selected}/></div></div><div className="book-cover" ref={cover}><div className="cover-spine">SSN CODING CLUB</div><div className="cover-front"><span>SSN / EVENTS / 2026</span><h2 className="heading-type-reveal book-heading-reveal" key={selected.id}>{selected.title}</h2><span className="cover-sticker">THE STORY</span><div className="cover-bottom">{selected.type} · {dateText(selected.date)}<BookOpen size={33}/></div></div></div></div></div><div className="overlay-hint">click a page to turn · drag across or scroll for control · esc to close</div></div>}
 </main>
}

function BookPages({event,rightEvent}:{event:ClubEvent;rightEvent?:ClubEvent}){const detail=rightEvent||event;return <><div className="book-photo-page"><div className="page-tag">{event.vertical} / {event.type}</div><div className="photo-frame"><img draggable={false} src={event.image} alt={`${event.title} event visual`} onError={e=>{e.currentTarget.src="/event-posters/fullstack.svg"}}/></div><div className="photo-caption">SSN CODING CLUB — {dateText(event.date)}</div><div className="photo-decor">✳</div></div><div className="book-details-page"><div className="day-tab">{dateText(detail.date)}</div><div className="detail-eyebrow">THE EVENT STORY / {detail.type.toUpperCase()}</div><h2 className="heading-type-reveal book-heading-reveal" key={detail.id}>{detail.title}</h2><div className="detail-rule"/><h3 className="heading-type-reveal">ABOUT THE EVENT</h3><p>{detail.description}</p><p className="detail-story">{detail.story}</p><div className="event-meta"><span><CalendarDays size={17}/>{dateText(detail.date)}</span><span><Clock3 size={17}/>{detail.time}</span><span><MapPin size={17}/>{detail.venue}</span></div><a className="event-action" href={detail.link||'#'} onClick={e=>{if(!detail.link||detail.link==='#')e.preventDefault()}}>GO TO EVENT <ArrowRight size={21}/></a><div className="page-number">SSN / EVENT ARCHIVE — 2026</div></div></>}
