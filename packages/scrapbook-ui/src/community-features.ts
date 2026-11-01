export const baseTabs=['projects','events','blogs'];
export function verticalTabs(slug:string){return [...baseTabs,...((slug==='competitive-programming'||slug==='cybersecurity')?['leaderboard','resources']:slug==='ssnhacks'?['hall-of-fame']:slug==='ai-ml'?['resources']:[])];}
