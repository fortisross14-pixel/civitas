// CIVITAS v1.3 — the city's character: where its weight lies between trade,
// industry, culture, faith and learning. Read from what the city actually is
// (jobs, prestige, influence, education), it steers informal growth and the
// Turning Points offered, so a city that leans one way is offered more of it.
export const CHARACTER_AXES=['trade','industry','culture','faith','learning'];
export const AXIS_NAMES={trade:'Trade',industry:'Industry',culture:'Culture',faith:'Faith',learning:'Learning'};
export const DOMAIN_AXIS={trade:'trade',industry:'industry',culture:'culture',religion:'faith',education:'learning'};
export function characterOf(s,year=1300){
  const jobs=s.sectorJobs||{},total=Math.max(1,Object.values(jobs).reduce((a,v)=>a+v,0));
  const raw={
    trade:((jobs.trade||0)+(jobs.hotel||0))/total*110,
    industry:(jobs.craft||0)/total*130,
    culture:Math.sqrt(Math.max(0,s.culturalPrestige||0))*2.4,
    faith:Math.sqrt(Math.max(0,s.religiousInfluence||0))*3.2,
    learning:Math.sqrt(Math.max(0,s.educationIndex||0))*3.2
  };
  const sum=Math.max(1,Object.values(raw).reduce((a,v)=>a+v,0));
  const shares=Object.fromEntries(CHARACTER_AXES.map(k=>[k,Math.round(raw[k]/sum*1000)/1000]));
  const ranked=CHARACTER_AXES.slice().sort((a,b)=>shares[b]-shares[a]);
  const lead=ranked[0],clear=shares[lead]>=.27&&shares[lead]-shares[ranked[1]]>=.04;
  const titles={trade:'Merchant City',industry:year<1750?'Mill Town':'Industrial City',culture:'City of Arts',faith:'City of Spires',learning:'City of Learning'};
  return {shares,lead:clear?lead:null,title:clear?titles[lead]:'A Balanced City'};
}
