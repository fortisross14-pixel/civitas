// CIVITAS v1.3 — city policies. Each is a standing choice with a trade-off,
// available in a window of history. Effects use the same modifier keys as
// cards; `cost` is extra spending per year (scaled by era), `serviceCost` raises
// public-service spending, and hooks (fire, epidemic, heritage, garden city)
// are read directly by the simulation.
export const POLICIES=[
  {id:'guild_charters',name:'Guild Charters',from:1300,to:1799,domain:'industry',
   description:'Guilds guarantee quality: industry +10%, prosperity +2, but new workshops open 25% more slowly.',
   effects:{industry:.10,prosperity:2,industrialDevelopment:-.25}},
  {id:'tolerance',name:'Religious Tolerance',from:1500,to:2030,domain:'trade',
   description:'Refugees and dissenters are welcome: migration +15%, commerce +5%, religious influence −20%.',
   effects:{migration:.15,trade:.05,faith:-.20}},
  {id:'free_port',name:'Free Port',from:1550,to:2030,domain:'trade',water:true,
   description:'No customs dues: commerce +15% and more merchants, but treasury income −10%.',
   effects:{trade:.15,merchantMigration:.10,treasury:-.10}},
  {id:'fire_code',name:'Stone & Brick Fire Code',from:1600,to:2030,domain:'population',
   description:'Halves the damage of urban fires; new homes are 8% smaller.',
   effects:{newHousing:-.08},hooks:{fire:.5}},
  {id:'health_board',name:'Board of Health',from:1700,to:2030,domain:'education',
   description:'Epidemics take 60% fewer lives; public services cost 8% more.',
   effects:{prosperity:1},serviceCost:.08,hooks:{epidemic:.4}},
  {id:'public_schools',name:'Public Schooling',from:1800,to:2030,domain:'education',
   description:'Education +25% and innovation +10%; public services cost 10% more.',
   effects:{education:.25,innovation:.10},serviceCost:.10},
  {id:'heritage_law',name:'Heritage Law',from:1850,to:2030,domain:'culture',
   description:'Buildings over 150 years old are never redeveloped; heritage appeal +25%, redevelopment −40%.',
   effects:{heritage:.25,renewal:-.40},hooks:{heritage:150}},
  {id:'garden_city',name:'Garden City Planning',from:1900,to:2030,domain:'population',
   description:'Green buffers halve the harm of industry to nearby homes; growth −10%; costs upkeep.',
   effects:{development:-.10,prosperity:1},cost:6}
];
export const POLICY_INDEX=Object.fromEntries(POLICIES.map(p=>[p.id,p]));
const WATER=['river','coast','estuary','lake'];
// Policies currently in force (adopted and inside their historical window).
export function activePolicies(city){
  const out={};
  for(const [id,since] of Object.entries(city?.policies||{})){const p=POLICY_INDEX[id];if(p&&city.year>=p.from&&city.year<=p.to)out[id]=p;}
  return out;
}
export function policyIssue(city,id){
  const p=POLICY_INDEX[id];if(!p)return 'Unknown policy';
  if(city.finished)return 'This chronicle is complete';
  if(city.year<p.from)return `Available from ${p.from}`;
  if(city.year>p.to)return `Abandoned after ${p.to}`;
  if(p.water&&!WATER.includes(city.type))return 'Needs a harbour or river';
  return null;
}
export function policyEffects(city){
  const out={};
  for(const p of Object.values(activePolicies(city)))for(const [k,v] of Object.entries(p.effects||{}))out[k]=(out[k]||0)+v;
  return out;
}
export function policyHook(city,hook){
  let v=null;for(const p of Object.values(activePolicies(city)))if(p.hooks?.[hook]!=null)v=p.hooks[hook];return v;
}
export function policyCosts(city){
  let cost=0,service=0;for(const p of Object.values(activePolicies(city))){cost+=p.cost||0;service+=p.serviceCost||0;}
  return {cost,service};
}
