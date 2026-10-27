'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ArrowDown,ArrowUpRight,Code2,BookOpen,Lightbulb,Users,Terminal} from 'lucide-react';

const commands=[['verticals','explore our verticals','#ef2d86'],['events','view upcoming events','#f07939'],['blogs','read our latest blogs','#d1a22e'],['projects','check out our projects','#13866d'],['people','meet the team','#5847bd'],['join','find your people','#13866d'],['about','know more about us','#74468b']];
const headline=['A community','for curious minds','who build._'];
function TypeLine({value,delay=0,className=''}:{value:string,delay?:number,className?:string}){
 const [length,setLength]=useState(0);
 useEffect(()=>{let timer:ReturnType<typeof setInterval>;const starter=setTimeout(()=>{timer=setInterval(()=>setLength(v=>{if(v>=value.length){clearInterval(timer);return v;}return v+1;}),55);},delay);return()=>{clearTimeout(starter);clearInterval(timer);};},[value,delay]);
 return <span className={className}>{value.slice(0,length)}<span className={`typing-caret ${length===value.length?'typing-caret-done':''}`}/></span>;
}
export default function Landing({onNavigate}:{onNavigate?:(route:string)=>void}={}){
 const router=useRouter();const screenRef=useRef<HTMLDivElement>(null);const [input,setInput]=useState('');const [message,setMessage]=useState('');
 const navigate=useCallback((route:string)=>{
  if(onNavigate){onNavigate(route);return}
  router.push(route);
 },[router,onNavigate]);
 useEffect(()=>{const trigger=(event:Event)=>{const route=(event as CustomEvent<string>).detail||'/verticals';navigate(route);};window.addEventListener('ssn:landing-escape',trigger);return()=>window.removeEventListener('ssn:landing-escape',trigger);},[navigate]);
 const goProjects=useCallback(()=>navigate('/projects'),[navigate]);
 useEffect(()=>{['verticals','events','blogs','projects','people','join'].forEach(v=>router.prefetch('/'+v));},[router]);
 const submit=(e:React.FormEvent)=>{e.preventDefault();const command=input.trim().toLowerCase().replace(/^\//,'');
  const target=command==='project'?'projects':command;
  if(['verticals','events','blogs','projects','people','join'].includes(target)){navigate('/'+target)}
  else if(command==='help'){setMessage('available: verticals, events, blogs, projects, people, join')}
  else if(command==='about'){setMessage('about page coming soon')}
  else{setMessage('type verticals, events, blogs, projects, people or join')}
  setInput('');};
 return <main className='landing-shell realistic-landing'>
  <header className='landing-nav' style={{display:'none'}}><div className='traffic'><i/><i/><i/></div><span className='landing-brand'>ssn@codingclub:~</span><nav aria-label='Main navigation'><a className='active' href='/'>01. home</a><a href='/verticals' onClick={e=>{e.preventDefault();navigate('/verticals')}}>02. verticals</a><a href='/events' onClick={e=>{e.preventDefault();navigate('/events')}}>03. events</a><a href='/blogs' onClick={e=>{e.preventDefault();navigate('/blogs')}}>04. blogs</a><a href='/projects' onClick={e=>{e.preventDefault();goProjects();}}>05. projects</a><a href='/people' onClick={e=>{e.preventDefault();navigate('/people')}}>06. people</a><a href='/#verticals'>07. about</a></nav><a className='landing-join' href='mailto:hello@ssncodingclub.com'>join us ↗</a></header>
  <section className='photo-hero' aria-label='SSN Coding Club landing page'>
    <div className='photo-screen' ref={screenRef}>
    <div className='display-main'><div className='terminal-welcome'>ssn@codingclub:~$ <b><TypeLine value='welcome' delay={120}/></b></div><div className='hero-headline'>{headline.map((line,i)=><div key={line} className={i===2?'pink-text':''}><TypeLine value={line} delay={380+i*1050}/></div>)}</div><p className='hero-description'>SSN Coding Club is a space to explore technology<br className='desktop-break'/> in all its forms — through workshops, projects,<br className='desktop-break'/> blogs and a community that learns and builds together.</p>
     <div className='command-box'><div className='command-box-heading'>Type a command to explore:</div>{commands.map(([command,description,color])=><button type='button' key={command} className='command-row' onClick={()=>command==='about'?setMessage('about page coming soon'):navigate('/'+command)}><span className='command-chevron' style={{color}}>›</span><b style={{color}}>{command}_</b><span>– {description}</span></button>)}</div>
     <form className='prompt-form' onSubmit={submit}><label htmlFor='command-input'>ssn@codingclub:~$</label><input id='command-input' value={input} onChange={e=>setInput(e.target.value)} placeholder='▮' autoComplete='off' autoCapitalize='none' spellCheck={false} aria-label='Terminal command'/><button type='submit' aria-label='Run command'>↵</button></form>{message&&<div className='terminal-feedback' role='status'>{message}</div>}</div>
    <div className='screen-illustration' aria-hidden='true'><svg viewBox="0 0 300 230" fill="none" stroke="#17212a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 202H286M80 213H252M108 193l11-76q1-8 10-8h104q9 0 8 9l-8 75zM122 181l9-60h98l-9 60zM97 194h148l-9 9H105z"/><path d="m167 140-13 12 12 11m32-23 13 12-15 12m-12-30-8 39"/><path d="M91 12v40m-6 0h12v9H85zM83 61h16l18 27H66zM82 92q9 9 17 0"/><path d="M154 77h109v7H154zM161 85v9m93-9v9M168 76V51h17v25m6 0V39h15v37m6 0V56h12v20m6 0V64h20v12"/><path d="M65 201l-4-24h26l-4 24zM74 178v-60m0 38q-25-2-22-22 18 4 22 22zm0-14q-17-10-13-28 14 8 13 28zm1 18q23-8 20-27-17 8-20 27zm0-36q17-8 13-24-12 7-13 24z"/><path d="M22 201v-40h12v40m4 0v-49h13v49m-25-32h4m12-10h5M262 201v-25h19v25m-14-25-6-20q8-7 11 20m3-1 7-23m-3 22 9-12"/></svg><div className='tiny-note'>✳</div><div className='sticky-doodle'>☺</div><div className='quote-sticky'>“learn<br/> build<br/> collaborate<br/> <b>repeat.</b>”</div></div>
    </div>
    <button className='scroll-to-projects photo-scroll' onClick={goProjects} aria-label='Enter projects'><ArrowDown size={26}/></button>
  </section>
  <section className='landing-teaser' id='verticals' style={{display:'none'}}><div className='teaser-top'><span>ssn@codingclub:~$ <b>verticals</b></span><span>[ 07 verticals ]</span></div><h2><span>//</span> OUR VERTICALS</h2><p>Same community, different interests. Scroll or enter <strong>projects</strong> to explore what we've built.</p><div className='teaser-notes'>{[['01','FULL STACK','#a7d8f3'],['02','AI / ML','#f7b2c6'],['03','CYBERSECURITY','#b7dcaa'],['04','AR / VR','#f7c29e'],['05','DESIGN','#d5b5ee'],['06','PR','#f4df9d'],['07','OPEN SOURCE','#a5e1d7']].map(([n,label,color])=><div key={n} style={{'--note':color} as React.CSSProperties}><span>{n}</span><b>{label}</b></div>)}</div><button className='teaser-projects-link' onClick={()=>navigate('/projects')}>explore projects <ArrowUpRight size={17}/></button></section>
 </main>;
}
