export type Member={id:string;name:string;role:string;photo:string};
export type Team={id:string;name:string;tagline:string;color:string;icon:string;members:Member[]};
// Replace placeholder profiles with confirmed club member details in a later data integration.
// Example: {id:'fullstack-lead',name:'Real Name',role:'Lead',photo:'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/people/name.jpg'}
const names=['Aarav','Isha','Rohan','Diya','Karthik','Nitya','Arjun','Saanvi','Vishal','Ananya','Aditya','Tanya','Rahul','Shruti','Kavin','Meera','Pranav','Aditi','Varun','Harini','Nikhil','Janani','Siddharth','Riya','Dev','Pooja','Ashwin','Sneha','Vivek','Kavya','Rithik','Anu','Sanjay','Priya','Akash','Divya','Saran','Maya','Krish','Nandini','Akhil','Keerthi','Hari','Tara','Yash'];
// Consistent placeholder headshots; change individual URLs when the team supplies photographs.
const portraits=[12,11,13,5,32,44,14,47,15,48,33,49,17,45,18,46,19,50,20,51,21,52,22,53,23,54,24,55,25,56,26,57,27,58,28,59,29,60,30,61,31,62,34,63,35];
const makeMembers=(offset:number,count:number,roles?:string[]):Member[]=>Array.from({length:count},(_,i)=>({id:`member-${offset+i}`,name:names[(offset+i)%names.length],role:roles?.[i]??(i===0?'Lead':'Member'),photo:`https://i.pravatar.cc/320?img=${portraits[(offset+i)%portraits.length]}`}));
export const officeBearers:Team={id:'office-bearers',name:'Office Bearers',tagline:'The people keeping the ideas moving.',color:'#f7df9f',icon:'crown',members:makeMembers(0,5,['Chairperson','Vice Chairperson','Secretary','Treasurer','Joint Secretary'])};
export const teams:Team[]=[
{id:'full-stack',name:'Full Stack',tagline:'Build\nend-to-end\nexperiences.',color:'#addbf2',icon:'code',members:makeMembers(5,10)},
{id:'ai-ml',name:'AI / ML',tagline:'Explore\nintelligence\nin everything.',color:'#edb7db',icon:'brain',members:makeMembers(15,10)},
{id:'cybersecurity',name:'Cybersecurity',tagline:'Think like\nan attacker.\nBuild like\na defender.',color:'#bfe3bc',icon:'shield',members:makeMembers(25,10)},
{id:'ar-vr',name:'AR / VR',tagline:'Create\nimmersive\nrealities.',color:'#f8c19b',icon:'vr',members:makeMembers(35,10)},
{id:'design',name:'Design',tagline:'Design for people.\nDesign for impact.',color:'#f4b5cc',icon:'palette',members:makeMembers(45,10)},
{id:'pr',name:'PR',tagline:'Tell our stories.\nBuild our brand.',color:'#f8d98b',icon:'megaphone',members:makeMembers(55,10)},
{id:'open-source',name:'Open Source',tagline:'Build together.\nGive back.',color:'#b4e5da',icon:'git',members:makeMembers(65,10)},
{id:'competitive-programming',name:'CP',tagline:'Think sharper.\nSolve smarter.\nCode against the clock.',color:'#d6cdf5',icon:'trophy',members:makeMembers(75,10)},
{id:'ssnhacks',name:'SSN Hacks',tagline:'Find your team.\nBuild an idea.\nMake it happen.',color:'#f7bcb0',icon:'rocket',members:makeMembers(85,10)}
];
