// CIVITAS v3.7 — Charters: the city's direction for each Age. When an Age begins (and
// when the town is founded) the council offers three directions; you sign one. For the
// rest of the Age it gives:
//   · buffs (small effects that last the Age),
//   · priority cards (the Market Hall and card events lean to that direction),
//   · a goal measured as growth during the Age ("raise GDP by 300%"), with a reward.
// Missing the goal costs nothing but the reward: the next Age brings a fresh choice.
// Directions are the six card families (a card's family is its doctrine tag).
import {AGES,ageAt} from './ages.js';
import {ERA_CARDS} from './turningPoints.js';
import {cardDoctrines,doctrineState} from './doctrines.js';

export const DIRECTIONS={
  industry:{name:'Industry',glyph:'▥',color:'#9a6b4e',stat:'gdp',buffs:{industry:.2,trade:.05},buffLine:'Workshops and works +20%'},
  trade:{name:'Trade',glyph:'▣',color:'#a07f3f',stat:'tradeJobs',buffs:{trade:.2,treasury:.06},buffLine:'Trade +20%, taxes +6%'},
  arts:{name:'Culture',glyph:'✦',color:'#8e6896',stat:'culture',buffs:{arts:.25,tourismIncome:.06},buffLine:'Culture +25%, visitors +6%'},
  faith:{name:'Faith',glyph:'✣',color:'#9a7d3e',stat:'faith',buffs:{faith:.25,prosperity:2},buffLine:'Faith +25%, prosperity +2'},
  learning:{name:'Learning',glyph:'◆',color:'#557f95',stat:'learning',buffs:{education:.25,innovation:.05},buffLine:'Learning +25%, invention +5%'},
  people:{name:'People',glyph:'◉',color:'#64875a',stat:'population',buffs:{housing:.1,migration:.08},buffLine:'Homes +10%, newcomers +8%'}
};
export const DIRECTION_IDS=Object.keys(DIRECTIONS);
export const CHARTER_STATS={
  population:{label:'Population',read:s=>s.population},
  gdp:{label:'GDP',read:s=>s.gdp},
  tradeJobs:{label:'Trade jobs',read:s=>s.sectorJobs?.trade||0},
  culture:{label:'Culture',read:s=>s.culturalPrestige},
  faith:{label:'Faith',read:s=>s.religiousInfluence},
  learning:{label:'Learning',read:s=>s.educationIndex},
  // Kept for scenarios and older saves.
  industry:{label:'Industry jobs',read:s=>s.sectorJobs?.craft||0},
  wealth:{label:'Wealth',read:s=>s.gdp}
};
// Growth asked over each Age, in percent of the value when the charter is signed
// (from how far the bots get without a charter; a focused city beats them). M4 tunes these.
const GROWTH={
  medieval:{gdp:600,tradeJobs:600,culture:400,faith:100,learning:60,population:120},
  renaissance:{gdp:300,tradeJobs:30,culture:80,faith:50,learning:100,population:120},
  enlightenment:{gdp:400,tradeJobs:150,culture:25,faith:10,learning:25,population:120},
  modern:{gdp:300,tradeJobs:80,culture:20,faith:8,learning:15,population:60},
  contemporary:{gdp:80,tradeJobs:15,culture:10,faith:6,learning:12,population:50}
};
const FLOOR={gdp:2000,tradeJobs:60,culture:20,faith:20,learning:20,population:600};

// A rare (or epic) card for the reward: in the run's pool, in date, of the direction if given.
export function rewardCard(city,rarity,direction,roll=Math.random){
  const pool=city.turning?.cardPool,y=city.year;
  const ok=c=>c.rarity===rarity&&!c.urban&&(!pool||pool.includes(c.id))&&(c.minYear??0)<=y&&(c.maxYear??9999)>=y;
  let list=ERA_CARDS.filter(c=>ok(c)&&(!direction||cardDoctrines(c).includes(direction)));
  if(!list.length)list=ERA_CARDS.filter(ok);
  if(!list.length)list=ERA_CARDS.filter(c=>c.rarity==='uncommon'&&(c.minYear??0)<=y&&(c.maxYear??9999)>=y);
  return list.length?list[Math.floor(roll()*list.length)%list.length].id:null;
}
// What the city leans to now: the direction whose stat is strongest against its reference.
// What the city leans to: its Founder's family, the cards it has played, and what it already does well.
function leanings(city,s){const st=doctrineState(city),f=city.perks?.favour;
  const sc={people:s.population/20000,industry:(s.sectorJobs?.craft||0)/4000,trade:(s.sectorJobs?.trade||0)/4000,arts:s.culturalPrestige/200,faith:s.religiousInfluence/200,learning:s.educationIndex/200};
  for(const d of DIRECTION_IDS)sc[d]=Math.min(2,sc[d])+(st.counts?.[d]||0)*.4+(f===d?2.5:0);
  return DIRECTION_IDS.slice().sort((a,b)=>sc[b]-sc[a]);}
const nice=v=>{if(v<100)return Math.max(10,Math.round(v/5)*5);const p=10**Math.floor(Math.log10(v)-1);return Math.round(v/p)*p;};
// The three directions on offer: what the city already leans to, and two others, so a
// change of course is always possible. s: stats(city); revenue: the yearly revenue (for the purse).
export function charterOptions(city,s,revenue=0){
  const age=ageAt(city.year),order=leanings(city,s),h=((city.seed>>>0)+age.from*7)%997;
  const rest=order.slice(1),a=rest.splice(h%rest.length,1)[0],b=rest[(h*7+3)%rest.length],picks=[order[0],a,b];
  const purse=k=>Math.max(100*k,Math.round(Math.max(revenue*k*2.5,(city.funds||0)*k*.12)/50)*50);
  return picks.map((d,i)=>{const D=DIRECTIONS[d],base=CHARTER_STATS[D.stat].read(s),pct=GROWTH[age.id][D.stat];
    const start=Math.max(base,FLOOR[D.stat]),target=nice(start*(1+pct/100));
    return {kind:'direction',direction:d,stat:D.stat,pct,start:Math.round(base),target,reward:{funds:purse(i===0?3:4),card:i===0?'rare':'epic',doctrine:d},tag:i===0?'Your strength':'A new course',age:age.id,by:age.to};});
}
// Sign one (index into city.charterOffer). The Market Hall favours its cards for the Age.
export function signCharter(city,index){
  const o=city.charterOffer?.[index];if(!o)return {city,error:'No charter to sign'};
  return {city:{...city,charter:{...o,signed:city.year,met:null},charterOffer:null,turning:{...(city.turning||{}),favour:{doctrine:o.direction,until:o.by+1}}},undo:null};
}
// The buffs of the signed charter while its Age lasts (sim.js adds them to cityEffects).
export function charterEffects(city){const ch=city.charter;if(!ch||ch.kind!=='direction'||city.year>ch.by)return {};return DIRECTIONS[ch.direction]?.buffs||{};}
// Once a year (from sim.js): pays a met goal. A missed one only lapses at the Age's end.
export function charterYear(city,year,readStats,roll=Math.random){
  const ch=city.charter;if(!ch||ch.met||ch.failed)return;
  const s=readStats(),v=CHARTER_STATS[ch.stat].read(s);
  if(v>=ch.target){
    const r=ch.reward||{},deck=city.deck;let cardId=null;
    if(r.card&&deck){cardId=rewardCard(city,r.card,r.doctrine,roll);if(cardId)city.deck={...deck,hand:[...deck.hand,{uid:deck.nextUid,cardId,paid:0,gift:true}],nextUid:deck.nextUid+1};}
    city.funds=(city.funds||0)+(r.funds||0);city.charterLP=(city.charterLP||0)+(r.lp||0);
    city.charter={...ch,met:year,cardId};city.chartersMet=(city.chartersMet||0)+1;
    city.events.push({year,type:'charter',text:`Charter fulfilled: ${charterLine(ch)}. +${(r.funds||0).toLocaleString('en-US')} to the treasury${cardId?' and a card for your hand':''}.`});
    city.charterToast={year,kind:'met'};
  }else if(year>=ch.by){
    city.charter={...ch,failed:year};
    city.events.push({year,type:'charter',text:`The Age ends with the charter's goal unmet (${charterLine(ch)}): no reward this time.`});
    city.charterToast={year,kind:'failed'};
  }
}
const short=n=>n>=1e9?`${(n/1e9).toFixed(1)}B`:n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e4?`${Math.round(n/1000)}k`:Math.round(n).toLocaleString('en-US');
export function charterLine(o){if(o.kind==='direction')return `${CHARTER_STATS[o.stat].label} +${o.pct}% (to ${short(o.target)})`;
  return `${CHARTER_STATS[o.stat]?.label||o.stat} ${short(o.target)}`;}
// For the HUD: progress 0..1 and the value now.
export function charterProgress(city,s){const ch=city.charter;if(!ch)return null;const v=CHARTER_STATS[ch.stat].read(s);
  const share=ch.kind==='direction'&&ch.target>ch.start?Math.max(0,Math.min(1,(v-ch.start)/(ch.target-ch.start))):Math.min(1,v/Math.max(1,ch.target));return {value:v,share};}
export const agesWithCharters=AGES.map(a=>a.id);
export const UNREST_ON_FAIL=0;
