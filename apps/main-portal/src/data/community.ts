export const communityLinks = [
 {id:'github',name:'GitHub',label:'Build in the open',detail:'Explore our code & contribute',href:'https://github.com/ssncodingclub',color:'#d6cdf5'},
 {id:'discord',name:'Discord',label:'Find your people',detail:'Talk tech, ask questions & team up',href:'https://discord.com/invite/hSGEaRUnws',color:'#c5d8f6'},
 {id:'linkedin',name:'LinkedIn',label:'Follow our journey',detail:'Club news & community milestones',href:'https://www.linkedin.com/company/ssn-coding-club/home/',color:'#bde5df'},
 {id:'instagram',name:'Instagram',label:'Catch the moments',detail:'A little behind the scenes',href:'https://www.instagram.com/ssn_codingclub?rpxt=M21iYmw5em9ydnA1',color:'#f5c5d6'},
 {id:'whatsapp',name:'WhatsApp',label:'Keep in the loop',detail:'Community invite coming soon',href:null,color:'#d4e7bd'},
] as const;
export type CommunityPlatform = (typeof communityLinks)[number]['id'];
