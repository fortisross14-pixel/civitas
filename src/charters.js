// CIVITAS v3 — Charters: the purpose of each Age in a Chronicle. When an Age
// begins (and when the town is founded) the council offers three charters and
// you sign one:
//   · a Growth charter: a population target, a sure reward;
//   · a Calling charter: renown in the city's own calling (faith, culture,
//     learning or industry), rewarded with a rare card of that doctrine;
//   · a World charter: enter the World Cities Top 20 in one category this Age,
//     a large reward and Legacy Points.
// Fulfil it before the Age ends and the reward is paid at once; miss it and
// the people lose faith in the council (Unrest). Pure functions.
import {AGES,ageAt} from './ages.js';
import {ERA_CARDS} from './turningPoints.js';
import {cardDoctrines,doctrineState} from './doctrines.js';
import {historicTable,RANK_INDEX} from './worldRankings.js';

// What a strong run reaches at the end of each Age (bots, v2.6 calibration).
const REF={
  medieval:{population:8000,industry:1500,faith:260,culture:160,learning:160},
  renaissance:{population:45000,industry:10000,faith:360,culture:260,learning:260},
  enlightenment:{population:150000,industry:45000,faith:420,culture:360,learning:330},
  modern:{population:400000,industry:150000,faith:440,culture:430,learning:380},
  contemporary:{population:900000,industry:350000,faith:460,culture:500,learning:420}
};
export const CHARTER_STATS={
  population:{label:'Population',icon:'population',read:s=>s.population},
  industry:{label:'Industry jobs',icon:'industry',read:s=>s.sectorJobs?.craft||0},
  faith:{label:'Faith',icon:'faith',read:s=>s.religiousInfluence},
  culture:{label:'Culture',icon:'culture',read:s=>s.culturalPrestige},
  learning:{label:'Learning',icon:'learning',read:s=>s.educationIndex},
  wealth:{label:'Wealth',icon:'wealth',read:s=>s.gdp}
};
const DOCTRINE_STAT={faith:'faith',arts:'culture',learning:'learning',industry:'industry',trade:'wealth',people:'population'};
const STAT_DOCTRINE={faith:'faith',culture:'arts',learning:'learning',industry:'industry',wealth:'trade',population:'people'};
export const UNREST_ON_FAIL=18;

const nice=v=>{if(v<100)return Math.max(10,Math.round(v/5)*5);const p=10**Math.floor(Math.log10(v)-1);return Math.round(v/p)*p;};
// The city's calling: its leading doctrine, else its founder's, else faith.
function calling(city){const st=doctrineState(city);const d=st.lead||city.perks?.favour||'faith';const stat=DOCTRINE_STAT[d]||'faith';return stat==='population'||stat==='wealth'?'faith':stat;}

// A rare (or epic) card for the reward: in the run's pool, in date, of the doctrine if given.
export function rewardCard(city,rarity,doctrine,roll=Math.random){
  const pool=city.turning?.cardPool,y=city.year;
  const ok=c=>c.rarity===rarity&&!c.urban&&(!pool||pool.includes(c.id))&&(c.minYear??0)<=y&&(c.maxYear??9999)>=y;
  let list=ERA_CARDS.filter(c=>ok(c)&&(!doctrine||cardDoctrines(c).includes(doctrine)));
  if(!list.length)list=ERA_CARDS.filter(ok);
  if(!list.length)list=ERA_CARDS.filter(c=>c.rarity==='uncommon'&&(c.minYear??0)<=y&&(c.maxYear??9999)>=y);
  return list.length?list[Math.floor(roll()*list.length)%list.length].id:null;
}

// The three charters on offer. s: stats(city); revenue: the yearly revenue (for the purse).
export function charterOptions(city,s,revenue=0){
  const age=ageAt(city.year),ref=REF[age.id],read=k=>CHARTER_STATS[k].read(s);
  const purse=k=>Math.max(100*k,Math.round(Math.max(revenue*k*2.5,(city.funds||0)*k*.12)/50)*50);
  const growth={kind:'growth',stat:'population',target:nice(Math.max(read('population')*1.25,ref.population*.7)),reward:{funds:purse(4)},tag:'Steady'};
  const c=calling(city),callingRef=ref[c]||ref.faith;
  const theme={kind:'calling',stat:c,target:nice(Math.max(read(c)*1.2+10,callingRef*.8)),reward:{funds:purse(2),card:'rare',doctrine:STAT_DOCTRINE[c]},tag:'Calling'};
  // World: the category where the city stands closest to the 20th place.
  const cats=['population','industry','faith','culture','learning','wealth'];
  const best=cats.map(k=>({k,need:historicTable(age.id,k)[19].value})).map(o=>({...o,ratio:read(o.k)/Math.max(1,o.need)})).sort((a,b)=>b.ratio-a.ratio)[0];
  const world={kind:'world',stat:best.k,target:best.need,reward:{funds:purse(6),card:'epic',lp:60},tag:'World Top 20'};
  return [growth,theme,world].map(o=>({...o,age:age.id,by:age.to}));
}
// Sign one (index into city.charterOffer).
export function signCharter(city,index){
  const o=city.charterOffer?.[index];if(!o)return {city,error:'No charter to sign'};
  return {city:{...city,charter:{...o,signed:city.year,met:null},charterOffer:null},undo:null};
}
// Once a year (from sim.js). Pays a met charter, penalises a missed one at the Age's end.
// Mutates city; roll for the reward card.
export function charterYear(city,year,readStats,roll=Math.random){
  const ch=city.charter;if(!ch||ch.met||ch.failed)return;
  const s=readStats(),v=CHARTER_STATS[ch.stat].read(s);
  if(v>=ch.target){
    const r=ch.reward||{},deck=city.deck;let cardId=null;
    if(r.card&&deck){cardId=rewardCard(city,r.card,r.doctrine,roll);if(cardId)city.deck={...deck,hand:[...deck.hand,{uid:deck.nextUid,cardId,paid:0,gift:true}],nextUid:deck.nextUid+1};}
    city.funds=(city.funds||0)+(r.funds||0);city.charterLP=(city.charterLP||0)+(r.lp||0);
    city.charter={...ch,met:year,cardId};city.chartersMet=(city.chartersMet||0)+1;
    city.events.push({year,type:'charter',text:`Charter fulfilled: ${charterLine(ch)}. +${(r.funds||0).toLocaleString('en-US')} to the treasury${cardId?' and a card for your hand':''}${r.lp?`, +${r.lp} Legacy Points`:''}.`});
    city.charterToast={year,kind:'met'};
  }else if(year>=ch.by){
    city.charter={...ch,failed:year};city.unrest=Math.min(100,(city.unrest||0)+UNREST_ON_FAIL);
    city.events.push({year,type:'charter',text:`Charter missed: ${charterLine(ch)}. The people lose faith in the council (Unrest +${UNREST_ON_FAIL}).`});
    city.charterToast={year,kind:'failed'};
  }
}
export function charterLine(o){const n=o.target>=1e9?`${(o.target/1e9).toFixed(1)}B`:o.target>=1e6?`${(o.target/1e6).toFixed(1)}M`:o.target>=1e4?`${Math.round(o.target/1000)}k`:o.target.toLocaleString('en-US');
  return o.kind==='world'?`World Top 20 in ${RANK_INDEX[o.stat].name} (${n})`:`${CHARTER_STATS[o.stat].label} ${n}`;}
// For the HUD: progress 0..1 and the value now.
export function charterProgress(city,s){const ch=city.charter;if(!ch)return null;const v=CHARTER_STATS[ch.stat].read(s);return {value:v,share:Math.min(1,v/Math.max(1,ch.target))};}
export const agesWithCharters=AGES.map(a=>a.id);
