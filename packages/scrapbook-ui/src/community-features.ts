export const baseTabs=['projects','events','blogs'];
export function verticalTabs(slug:string){return [...baseTabs,...((slug==='competitive-programming'||slug==='cybersecurity')?(slug==='competitive-programming'?['leaderboard','resources','roadmap']:['leaderboard','resources']):slug==='ssnhacks'?['hall-of-fame']:slug==='ai-ml'?['resources','roadmap']:[])];}
