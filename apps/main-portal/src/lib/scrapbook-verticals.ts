const notes=[
 {id:'full-stack',num:'01',name:'Full Stack',lines:['Build','end-to-end','experiences.'],color:'#b9e5fa',accent:'#3d8fb8',art:'laptop',angle:-5},
 {id:'ai-ml',num:'02',name:'AI / ML',lines:['Explore','intelligence','in everything.'],color:'#f3c8ec',accent:'#a967b4',art:'brain',angle:3},
 {id:'cybersecurity',num:'03',name:'Cybersecurity',lines:['Think like','an attacker.','Build like','a defender.'],color:'#cceabf',accent:'#578a65',art:'lock',angle:-2},
 {id:'ar-vr',num:'04',name:'AR / VR',lines:['Create','immersive','realities.'],color:'#ffd0a7',accent:'#e58b47',art:'vr',angle:4},
 {id:'design',num:'05',name:'Design',lines:['Design','for people.','Design','for impact.'],color:'#ffc0d6',accent:'#d65f8e',art:'design',angle:-4},
 {id:'pr',num:'06',name:'PR',lines:['Tell our','stories.','Build our brand.'],color:'#ffe29b',accent:'#c79535',art:'megaphone',angle:2},
 {id:'open-source',num:'07',name:'Open Source',lines:['Build together.','Give back.'],color:'#c4eee3',accent:'#4e9f8a',art:'git',angle:3},
 {id:'competitive-programming',num:'08',name:'CP',lines:['Think sharper.','Solve smarter.','Code against','the clock.'],color:'#d6cdf5',accent:'#8170b7',art:'trophy',angle:-3},
 {id:'ssnhacks',num:'09',name:'SSN Hacks',lines:['Find your team.','Build an idea.','Make it happen.'],color:'#f7bcb0',accent:'#bd7165',art:'rocket',angle:3}
] as const;

// Portal destinations share the CMS repository's deployment registry.
import portals from '../../../../content/club/portals.json';
const canonicalSlugs:Record<string,string>={'ar-vr':'ar-vr-game-dev',design:'design-ui-ux'};
export const verticals=notes.map(note=>{
 const slug=canonicalSlugs[note.id]??note.id;
 const portal=portals.find(portal=>portal.vertical===slug);
 return {...note,href:note.id==='pr'?'/#section-people':portal?`https://${portal.domain}`:`/verticals/${slug}`};
});
