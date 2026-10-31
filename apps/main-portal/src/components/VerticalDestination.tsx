import {VerticalNavbar,VerticalPortalHome,type VerticalSlug} from '@coding-club/scrapbook-ui';
import {verticals} from '../lib/scrapbook-verticals';
type Vertical=(typeof verticals)[number];
export default function VerticalDestination({vertical,preview=false}:{vertical:Vertical;preview?:boolean}){
 const slug=({'ar-vr':'ar-vr-game-dev',design:'design-ui-ux'} as Record<string,string>)[vertical.id]||vertical.id;
 return <div className={preview?'vertical-preview':undefined}><VerticalNavbar name={vertical.name} preview={preview}/><VerticalPortalHome slug={slug as VerticalSlug} preview={preview}/></div>;
}
