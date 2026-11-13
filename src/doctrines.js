// CIVITAS v1.8 — doctrines (docs/CARD_DESIGN.md §4). Cards belong to one of six
// doctrines (or Civic). Counting the doctrine's cards in play unlocks tiers at
// 2/4/6/8 whose effects reinforce a committed build; each doctrine's tier 4
// bends a different game system. This module only *describes* the state; the
// systems (needs, history, shop, drafts, districts, fields, economy, score)
// read `doctrineState(city).flags`. Player cities only (turning.mode 'era').
import {CARDS,CARD_INDEX} from './turningPoints.js';
import {townCenterLevel} from './construction.js';

export const DOCTRINES={
  faith:{name:'Faith',glyph:'✣',color:'#9a7d3e',build:'Holy City',
    tiers:['Churches serve homes 30% farther','Churches also count as markets for nearby homes','Holy City: pilgrim income; plague and war harm is halved','Sacred Capital: score ×1.25 while prosperity is 60 or more'],
    weakness:'From tier 4: tithes cut treasury income by 10% and industry by 10%'},
  industry:{name:'Industry',glyph:'▥',color:'#9a6b4e',build:'Forge City',
    tiers:['Zoned workshop land develops 50% faster','Workshops pay a levy and count as markets within 4 parcels','Industrial Giant: industry output +40%','Workshop of the World: score also counts jobs'],
    weakness:'From tier 4: smoke makes clean-air needs fill 50% faster'},
  trade:{name:'Trade',glyph:'▣',color:'#a07f3f',build:'Merchant Republic',
    tiers:['Market Hall prices −10%','+1 offer at every restock, and you may lock one offer','Merchant Empire: sell cards for their full price; the treasury earns interest','City of Bankers: score also counts the treasury'],
    weakness:'From tier 4: business swings are doubled and history costs 50% more'},
  arts:{name:'Arts',glyph:'✦',color:'#8e6896',build:'City of the Arts',
    tiers:['Gardens and landmarks clear the smoke around them','Landmarks raise land value over twice the radius','The Renaissance: tourism income grows with every Arts card','Capital of Culture: score grows with prestige'],
    weakness:'Arts cards cost 1.5× upkeep'},
  learning:{name:'Learning',glyph:'◆',color:'#557f95',build:'Seat of Learning',
    tiers:['Foresight: history is announced 10 years ahead','Era drafts offer 4 cards','Knowledge Capital: innovation compounds with every Learning card','City of Reason: Learning cards cost half in the Market Hall'],
    weakness:'Slow: Learning payoffs grow over decades'},
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
  holy_scholars:['faith','learning'],trading_empire:['industry','trade'],tourist_paradise:['arts','trade']};
export function cardDoctrines(card){if(!card)return [];if(OVERRIDES[card.id])return OVERRIDES[card.id];const d=DOMAIN_TO[card.domain];return d?[d]:[];}
// Standing buildings that count toward a doctrine (one per kind).
export const BUILDING_DOCTRINE={chapel:'faith',monastery:'faith',shrine:'faith',market:'trade',guildhall:'trade',port:'trade',powerworks:'industry',workshop:'arts',garden:'arts',museum:'arts',monument:'arts',school:'learning',university:'learning',research_center:'learning',granary:'people'};

// Card types (§3): Building, Decree, Event, Patron. Decrees and Patrons take slots.
export const PATRONS=new Set(['sacred_city','industrial_revolution','cultural_renaissance','knowledge_economy']);
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
  if(tiers.faith>=2){f.churchMarket=true;add('treasury',-.1);add('industry',-.1);}
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
  if(counts.arts>0)f.artsUpkeep=1.5;
  if(tiers.arts>=1)f.artsGreen=true;
  if(tiers.arts>=2)f.prestigeReach=2;
  if(tiers.arts>=3)add('tourismIncome',.03*counts.arts);
  if(tiers.arts>=4)f.scorePrestige=.3;
  // Learning
  if(tiers.learning>=1)f.omenLead=10;
  if(tiers.learning>=2)f.draftOptions=4;
  if(tiers.learning>=3){add('innovation',.05*counts.learning);add('education',.1);}
  if(tiers.learning>=4)f.learningDiscount=.5;
  // People
  if(tiers.people>=1)f.declineShare=.5;
  if(tiers.people>=2)f.districtMin=7;
  if(tiers.people>=3){f.needRate=.7;add('housing',.2);add('migration',.25);}
  if(tiers.people>=4)f.scorePopulation=1.2;
  if(tiers.people>=1)add('prosperity',-tiers.people);
  return {on,counts,tiers,lead,flags:f,effects:e};
}
export const doctrineFlags=city=>doctrineState(city).flags;
// Score multiplier and bonus for this year (tier-8 payoffs).
export function scoreBonus(city,s){
  const f=doctrineFlags(city);let mult=1,add=0;
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
  return 1+.6*Math.max(0,...cardDoctrines(card).map(d=>st.counts[d]||0));
}
export {CARDS};
