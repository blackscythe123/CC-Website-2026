import Link from 'next/link';
import Illustration from './Illustration';
import {verticals} from '../lib/scrapbook-verticals';
type Vertical = (typeof verticals)[number];
export default function VerticalDestination({vertical, preview=false}:{vertical:Vertical;preview?:boolean}){
 return <main className={`mock-page ${preview?'mock-page-preview':''}`}>
  <div className="mock-window">
   <div className="mock-toolbar"><span>●</span><span>●</span><span>●</span><p>ssn@codingclub:~$ {vertical.id}</p></div>
   <Link className="back" href="/#section-verticals">← back to verticals</Link>
   <div className="mock-content"><span className="mock-index">// VERTICAL {vertical.num}</span>
    <div className="mock-illustration" style={{background:vertical.color}}><Illustration type={vertical.art}/></div>
    <h1>{vertical.name}</h1><p>{vertical.lines.join(' ')}</p>
    <div className="mock-pill">Projects coming soon</div><div className="mock-pill">Events coming soon</div>
   </div>
  </div>
 </main>
}
