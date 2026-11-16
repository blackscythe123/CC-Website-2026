import {VerticalNavbar,VerticalPortalHome,type Blog,type VerticalSlug} from '@coding-club/scrapbook-ui';
import {verticals} from '../lib/scrapbook-verticals';
type Vertical=(typeof verticals)[number];
export default function VerticalDestination({vertical,blogs=[],preview=false}:{vertical:Vertical;blogs?:Blog[];preview?:boolean}){
 const slug=({'ar-vr':'ar-vr-game-dev',design:'design-ui-ux'} as Record<string,string>)[vertical.id]||vertical.id;
 return <div className={preview?'vertical-preview':undefined}><VerticalNavbar name={vertical.name} preview={preview} slug={slug}/><VerticalPortalHome slug={slug as VerticalSlug} blogs={blogs} preview={preview}/></div>;
}
