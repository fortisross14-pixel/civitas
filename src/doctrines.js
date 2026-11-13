// CIVITAS v1.8 — doctrines (docs/CARD_DESIGN.md §4). Cards belong to one of six
// doctrines (or Civic). Counting the doctrine's cards in play unlocks tiers at
// 2/4/6/8 whose effects reinforce a committed build; each doctrine's tier 4
// bends a different game system. This module only *describes* the state; the
// systems (needs, history, shop, drafts, districts, fields, economy, score)
// read `doctrineState(city).flags`. Player cities only (turning.mode 'era').
import {CARDS,ERA_CARDS,CARD_INDEX,setCardScale,ERA_KEY_SCALE} from './turningPoints.js';
import {townCenterLevel} from './construction.js';
import {setDevelopmentFloorHook} from './development.js';

export const DOCTRINES={
  faith:{name:'Faith',glyph:'✣',color:'#9a7d3e',build:'Holy City',
    tiers:['Churches serve homes 30% farther','Churches also count as markets for nearby homes','Holy City: pilgrim income; plague and war harm is halved','Sacred Capital: score ×1.25 while prosperity is 60 or more'],
    weakness:'From tier 4: tithes cut treasury income by 5% and industry by 10%'},
  industry:{name:'Industry',glyph:'▥',color:'#9a6b4e',build:'Forge City',
    tiers:['Zoned workshop land develops 50% faster','Workshops pay a levy and count as markets within 4 parcels','Industrial Giant: industry output +40%','Workshop of the World: score also counts jobs'],
    weakness:'From tier 4: smoke makes clean-air needs fill 50% faster'},
  trade:{name:'Trade',glyph:'▣',color:'#a07f3f',build:'Merchant Republic',
    tiers:['Market Hall prices −10%','+1 offer at every restock, and you may lock one offer','Merchant Empire: sell cards for their full price; the treasury earns interest','City of Bankers: score also counts the treasury'],
    weakness:'From tier 4: business swings are doubled and history costs 50% more'},
  arts:{name:'Arts',glyph:'✦',color:'#8e6896',build:'City of the Arts',
    tiers:['Gardens and landmarks clear the smoke around them','Landmarks raise land value over twice the radius','The Renaissance: tourism income grows with every Arts card','Capital of Culture: score grows with prestige'],
    weakness:'Arts cards cost 1.25× upkeep'},
  learning:{name:'Learning',glyph:'◆',color:'#557f95',build:'Seat of Learning',
    tiers:['Foresight: history is announced 10 years ahead','Scholars advise the council: history that costs money costs half','Knowledge Capital: era drafts offer 4 cards; innovation compounds with every Learning card','City of Reason: Learning cards cost 15% less in the Market Hall'],
    weakness:'Slow fame: a scholar city earns 65% of the usual Renown'},
  people:{name:'People',glyph:'◉',color:'#64875a',build:'Teeming Metropolis',
    tiers:['Declines empty half as many homes','Districts form at 7 buildings instead of 10','Vertical Metropolis: needs fill 30% slower; housing +20%, migration +25%','World City: score ×1.2 from population above 100,000'],
    weakness:'Crowding: prosperity −1 per tier'}
};
export const DOCTRINE_IDS=Object.keys(DOCTRINES);
export const TIER_AT=[2,4,6,8];
export const tierOf=n=>n>=8?4:n>=6?3:n>=4?2:n>=2?1:0;
export const nextThreshold=n=>TIER_AT.find(t=>t>n)??null;

const DOMAIN_TO={religion:'faith',industry:'industry',trade:'trade',culture:'arts',education:'learning',population:'people'};
// Cards whose doctrine differs from their v1.7 domain, Civic cards and hybrids.
const OVERRIDES={civic_reform:[],urban_renewal:[],grand_patronage:[],monumental_ambition:[],world_exposition:[],
  great_migration:['people'],ruthless_industry:['industry'],city_reinvention:['people'],
  holy_scholars:['faith','learning'],trading_empire:['industry','trade'],tourist_paradise:['arts','trade'],
  workshop_renaissance:['industry','arts'],pilgrim_fairs:['faith','trade'],model_village:['industry','people'],modernization_plan:['learning','people'],
  cathedral_school:['faith','learning'],opera_house:['arts','people'],patent_office:['learning','industry']};
export function cardDoctrines(card){if(!card)return [];if(OVERRIDES[card.id])return OVERRIDES[card.id];const d=DOMAIN_TO[card.domain];return d?[d]:[];}
// Standing buildings that count toward a doctrine (one per kind).
export const BUILDING_DOCTRINE={cathedral:'faith',great_foundry:'industry',grand_exchange:'trade',palace_muses:'arts',great_university:'learning',metropolis_tower:'people',chapel:'faith',monastery:'faith',shrine:'faith',market:'trade',guildhall:'trade',port:'trade',powerworks:'industry',workshop:'arts',garden:'arts',museum:'arts',monument:'arts',school:'learning',university:'learning',research_center:'learning',granary:'people'};

// Card types (§3): Building, Decree, Event, Patron. Decrees and Patrons take slots.
export const PATRONS=new Set(['sacred_city','industrial_revolution','cultural_renaissance','knowledge_economy','bourse','vertical_metropolis']);
export const PATRON_OF={sacred_city:'faith',industrial_revolution:'industry',bourse:'trade',cultural_renaissance:'arts',knowledge_economy:'learning',vertical_metropolis:'people'};
// What a Patron grows, per card of its doctrine in play.
export const PATRON_KEY={faith:'faith',industry:'industry',trade:'trade',arts:'arts',learning:'education',people:'housing'};
export const PATRON_PER_CARD=.04;
// v1.9 tier power: a deep doctrine lifts the whole city (prosperity points by tier).
// Prosperity is capped near 98, so tier power mostly flows into productivity
// (the gdp key feeds the economy axis, which drives long-run growth).
export const TIER_POWER=[0,0,1,3,5];
export const TIER_GDP=[0,0,.08,.2,.4];
// Development floors by tier (economy and technology axes drive productivity
// growth; institutions hold them up, and so does a deep doctrine).
export const TIER_DEV_FLOOR=[0,0,10,20,30];
export const DEV_WEIGHT={faith:1.3,industry:1.7,trade:.8,arts:2.1,learning:0,people:1.5};
// Focus perk: once a doctrine has 2 cards in play, its cards cost 20% less.
export const FOCUS_DISCOUNT=.8;
export function doctrineDevelopmentFloor(city){
  const st=doctrineState(city);if(!st.on)return 0;
  return Math.max(0,...DOCTRINE_IDS.map(d=>TIER_DEV_FLOOR[st.tiers[d]]*DEV_WEIGHT[d]));
}
// Calibrated with the scripted players (docs/ROADMAP.md, R2): doctrines whose own
// effects reach the score less directly get more tier power.
export const DOCTRINE_POWER={faith:2.0,industry:2.6,trade:.9,arts:3.0,learning:.3,people:1.5};
// Growth by tier (migration, housing), weighted the same way.
export const TIER_GROWTH=[0,0,.03,.08,.15];
// Raw card strength by doctrine, so no doctrine's cards dominate on their own.
export const CARD_SCALE={faith:1.6,industry:2.2,trade:.95,arts:3.2,learning:.1,people:1.2};
// Renown: a city known for one thing. Yearly score × (1 + RENOWN[tier]) of the
// single deepest doctrine, so one deep doctrine beats many shallow ones.
export const RENOWN=[0,0,0,.45,1.0];
// Learning's weakness: a scholar city's fame spreads slowly.
export const RENOWN_WEIGHT={faith:1,industry:1.1,trade:1,arts:1,learning:.65,people:1};
setCardScale(card=>{const t=cardDoctrines(card);return t.length?Math.max(...t.map(d=>CARD_SCALE[d]??1)):1;});
// Evolutions (§5): a Lv3 card plus its doctrine's Patron awards a Wonder to place.
export const WONDERS=[
  {id:'cathedral',doctrine:'faith',card:'b_chapel',patron:'sacred_city',name:'The Cathedral',description:'A cathedral on the hill: faith doubles, every home nearby is served, pilgrims pay their way.'},
  {id:'great_foundry',doctrine:'industry',card:'b_powerworks',patron:'industrial_revolution',name:'The Great Foundry',description:'The works of the age: industry soars and its smoke is tamed.'},
  {id:'grand_exchange',doctrine:'trade',card:'b_market',patron:'bourse',name:'The Grand Exchange',description:'The bourse of the continent: commerce, credit and two more Market Hall offers.'},
  {id:'palace_muses',doctrine:'arts',card:'hire_artists',patron:'cultural_renaissance',name:'Palace of the Muses',description:'A palace for the arts: prestige across the city and visitors from abroad.'},
  {id:'great_university',doctrine:'learning',card:'free_university',patron:'knowledge_economy',name:'The Great University',description:'A university of renown: learning and invention, and history foreseen 14 years ahead.'},
  {id:'metropolis_tower',doctrine:'people',card:'b_granary',patron:'vertical_metropolis',name:'The Metropolis Charter',description:'A charter for a great city: housing for the many and new districts along the main roads.'}
];
export const WONDER_INDEX=Object.fromEntries(WONDERS.map(w=>[w.id,w]));
export function cardType(card){
  if(!card)return 'decree';
  if(PATRONS.has(card.id))return 'patron';
  if(card.building)return 'building';
  if(card.kind==='instant'||card.durationPoints)return 'event';
  return 'decree';
}
export const TYPE_LABEL={building:'Building',decree:'Decree',event:'Event',patron:'Patron'};
export const MAX_LEVEL=3;

export function doctrinesOn(city){return city?.turning?.mode==='era';}
export function decreeSlots(city){const l=townCenterLevel(city)?.level||1;return 8+(l>=3?1:0)+(l>=5?1:0);}

// Picks that are currently in effect (not retired, not expired, buildings placed).
export function activePicks(city){
  const picks=city?.turning?.choices||[],out=[];
  picks.forEach((p,i)=>{
    if(p.retired)return;const c=CARD_INDEX[p.cardId];if(!c)return;
    // Instant cards apply once and do not stay in play.
    if(c.kind==='instant')return;
    if(p.via==='hand'&&Number.isFinite(p.until)&&(city.year||0)>p.until)return;
    if(c.building&&!(city.landmarks||[]).some(l=>l.source===`choice:${i}`))return;
    out.push({...p,index:i,card:c});
  });
  return out;
}
// Level of a card = active copies, at most MAX_LEVEL.
export function cardLevel(city,cardId){return Math.min(MAX_LEVEL,activePicks(city).filter(p=>p.cardId===cardId).length);}
export function decreesInPlay(city){return [...new Set(activePicks(city).filter(p=>['decree','patron'].includes(cardType(p.card))).map(p=>p.cardId))];}

const cache=new WeakMap();
export function doctrineState(city){
  const key=city?.turning?.choices;
  if(key){const hit=cache.get(key);if(hit&&hit.year===city.year&&hit.blen===(city.buildings||[]).length&&hit.llen===(city.landmarks||[]).length&&hit.center===(city.center?.level||0))return hit.value;}
  const value=computeState(city);
  if(key)cache.set(key,{year:city.year,blen:(city.buildings||[]).length,llen:(city.landmarks||[]).length,center:city.center?.level||0,value});
  return value;
}
function computeState(city){
  const counts=Object.fromEntries(DOCTRINE_IDS.map(d=>[d,0])),on=doctrinesOn(city);
  if(!on)return {on,counts,tiers:{...counts},lead:null,flags:{},effects:{}};
  for(const id of new Set(activePicks(city).map(p=>p.cardId)))for(const d of cardDoctrines(CARD_INDEX[id]))counts[d]++;
  const kinds=new Set((city.buildings||[]).filter(b=>b.special&&!b.vacant).map(b=>b.special));
  for(const k of kinds){const d=BUILDING_DOCTRINE[k];if(d)counts[d]++;}
  const tiers=Object.fromEntries(DOCTRINE_IDS.map(d=>[d,tierOf(counts[d])]));
  const lead=DOCTRINE_IDS.filter(d=>counts[d]>0).sort((a,b)=>counts[b]-counts[a]||a.localeCompare(b))[0]||null;
  const f={},e={},add=(k,v)=>{e[k]=(e[k]||0)+v;};
  const crafts=(city.buildings||[]).filter(b=>b.type==='craft'&&!b.vacant).length;
  // Faith
  if(tiers.faith>=1)f.faithReach=.3;
  if(tiers.faith>=2){f.churchMarket=true;add('treasury',-.05);add('industry',-.1);}
  if(tiers.faith>=3){add('treasury',.12);add('pilgrimage',.2);add('faith',.3);f.harshHalved=true;}
  if(tiers.faith>=4)f.scoreSacred=1.25;
  // Industry
  if(tiers.industry>=1)f.craftBoost=1.5;
  if(tiers.industry>=2){f.workshopMarket=4;add('treasury',Math.min(.25,crafts*.004));f.airRate=1.5;}
  if(tiers.industry>=3)add('industry',.4);
  if(tiers.industry>=4)f.scorePerThousandJobs=.5;
  // Trade
  if(tiers.trade>=1)f.priceMult=.9;
  if(tiers.trade>=2){f.extraOffer=1;f.lock=true;f.cycleMult=2;f.eventFundsMult=1.5;}
  if(tiers.trade>=3){f.sellShare=1;f.interest=.015;}
  if(tiers.trade>=4)f.scorePerThousandFunds=1;
  // Arts
  if(counts.arts>0)f.artsUpkeep=1.25;
  if(tiers.arts>=1)f.artsGreen=true;
  if(tiers.arts>=2)f.prestigeReach=2;
  if(tiers.arts>=3)add('tourismIncome',.03*counts.arts);
  if(tiers.arts>=4)f.scorePrestige=.3;
  // Learning
  if(tiers.learning>=1)f.omenLead=10;
  if(tiers.learning>=2)f.eventFundsMult=(f.eventFundsMult||1)*.5;
  if(tiers.learning>=3)f.draftOptions=4;
  if(tiers.learning>=3)add('innovation',.015*counts.learning);
  if(tiers.learning>=4)f.learningDiscount=.85;
  // People
  if(tiers.people>=1)f.declineShare=.5;
  if(tiers.people>=2)f.districtMin=7;
  if(tiers.people>=3){f.needRate=.7;add('housing',.2);add('migration',.25);}
  if(tiers.people>=4)f.scorePopulation=1.2;
  if(tiers.people>=1)add('prosperity',-tiers.people);
  // Patrons scale with their doctrine; deep doctrines lift the city.
  for(const p of activePicks(city))if(PATRON_OF[p.cardId]){const d=PATRON_OF[p.cardId];add(PATRON_KEY[d],PATRON_PER_CARD*counts[d]);}
  for(const d of DOCTRINE_IDS)if(TIER_POWER[tiers[d]]){add('prosperity',TIER_POWER[tiers[d]]*DOCTRINE_POWER[d]);add('migration',TIER_GROWTH[tiers[d]]*DOCTRINE_POWER[d]);add('gdp',TIER_GDP[tiers[d]]*DOCTRINE_POWER[d]);add('housing',TIER_GROWTH[tiers[d]]*DOCTRINE_POWER[d]*.7);}
  // Wonders standing on the map.
  const standing=new Set((city.buildings||[]).filter(b=>!b.vacant&&WONDER_INDEX[b.special]).map(b=>b.special));
  if(standing.has('grand_exchange'))f.extraOffer=(f.extraOffer||0)+2;
  if(standing.has('great_university'))f.omenLead=14;
  if(standing.has('great_foundry'))add('pollution',-.3);
  // Compounding effects count less, as for cards (the power budget).
  for(const k of Object.keys(e))if(ERA_KEY_SCALE[k]&&e[k]>0)e[k]*=ERA_KEY_SCALE[k];
  return {on,counts,tiers,lead,flags:f,effects:e};
}
export const doctrineFlags=city=>doctrineState(city).flags;
// Score multiplier and bonus for this year (tier-8 payoffs).
export function scoreBonus(city,s){
  const st=doctrineState(city),f=st.flags;
  // Renown from the single deepest doctrine (ties: the one with the most cards).
  const deepest=st.on?DOCTRINE_IDS.reduce((b,d)=>st.tiers[d]>st.tiers[b]||(st.tiers[d]===st.tiers[b]&&st.counts[d]>st.counts[b])?d:b,DOCTRINE_IDS[0]):null;
  let mult=1+(deepest?RENOWN[st.tiers[deepest]]*RENOWN_WEIGHT[deepest]:0),add=0;
  if(f.scoreSacred&&(s.prosperity||0)>=60)mult*=f.scoreSacred;
  if(f.scorePopulation&&(s.population||0)>100000)mult*=1+(f.scorePopulation-1)*Math.min(1,((s.population||0)-100000)/100000);
  if(f.scorePrestige)mult*=1+Math.min(f.scorePrestige,(s.culturalPrestige||0)/2000);
  if(f.scorePerThousandJobs)add+=f.scorePerThousandJobs*(s.jobs||0)/1000;
  if(f.scorePerThousandFunds)add+=f.scorePerThousandFunds*Math.max(0,city.funds||0)/1000;
  return {mult,add};
}
// Cards that share the city's doctrines draw more often in the Market Hall.
export function doctrineWeight(city,card){
  const st=doctrineState(city);if(!st.on)return 1;
  return 1+1.2*Math.max(0,...cardDoctrines(card).map(d=>st.counts[d]||0));
}
export {CARDS};

// Wonders whose recipe the city now meets and has not yet been awarded.
export function wondersDue(city){
  if(!doctrinesOn(city))return [];const have=new Set(city.wonders||[]);
  return WONDERS.filter(w=>!have.has(w.id)&&cardLevel(city,w.card)>=MAX_LEVEL&&cardLevel(city,w.patron)>=1);
}

setDevelopmentFloorHook(doctrineDevelopmentFloor);
