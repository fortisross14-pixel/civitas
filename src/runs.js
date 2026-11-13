// CIVITAS v2.0 — runs and meta (Milestone R3, docs/ROADMAP.md).
// A run is one city from founding to 2030, or to Ruin. Before it you pick a
// Founder, artifacts, boosters and a Hardship; after it the run is recorded,
// Legacy Points are paid, and doctrine mastery opens more of the card pool.
// Pure functions: every call returns new objects.
import {ERA_CARDS,CARD_INDEX} from './turningPoints.js';
import {cardDoctrines,cardType,doctrineState,tierOf,DOCTRINE_IDS,DOCTRINES} from './doctrines.js';
import {deckOf,restockShop} from './cards.js';
import {stats} from './sim.js';
import {LOCKED_CARDS,FOUNDER_INDEX,ARTIFACT_INDEX,BOOSTER_INDEX,BOOSTERS_PER_CITY,MAX_HARDSHIP,RUNS_KEPT,
  normalizeLegacy,startRunProfile,scoreCity,founderOpen,artifactSlots} from './legacy.js';

// ───────────── The card pool ─────────────
// Starter Pool: every Common and Uncommon card, and all Civic cards. A
// doctrine's Rares open once a run reaches its tier 1 (two cards in play),
// its Epics and Patron at tier 2. Hybrids need every doctrine they belong to.
// Classic Legacy Market cards open the same way (or by buying them). So a first run cannot reach a
// Patron, and so no Wonder (a Wonder needs its Patron).
export const MASTERY_FOR={rare:1,epic:2,legend:2};
export function cardUnlocked(card,legacy){
  if(!card)return false;
  const l=legacy||{},mastery=l.mastery||{};
  const locked=LOCKED_CARDS.includes(card.id),tags=cardDoctrines(card);
  if(locked&&(l.unlockedCards||[]).includes(card.id))return true;
  // Classic Legacy Market cards of a doctrine also open through its mastery (tier 1 at least).
  const need=Math.max(locked?1:0,MASTERY_FOR[card.rarity]||0);
  if(!tags.length)return !locked;
  return !need||tags.every(d=>(mastery[d]||0)>=need);
}
export function eraCardPool(legacy){const l=normalizeLegacy(legacy);return ERA_CARDS.filter(c=>cardUnlocked(c,l)).map(c=>c.id);}
// What mastery would open next for a doctrine (for the Market and the summary).
export function masteryUnlocks(doctrine,tier){
  return ERA_CARDS.filter(c=>cardDoctrines(c).includes(doctrine)&&Math.max(LOCKED_CARDS.includes(c.id)?1:0,MASTERY_FOR[c.rarity]||0)===tier).map(c=>c.id);
}

// ───────────── Hardships ─────────────
// Each level: prosperity −1 for the whole run, Market prices +4%, the Unrest
// line 2 points higher, and +15% Legacy Points.
export const HARDSHIP_LP=.15,HARDSHIP_PROSPERITY=1,HARDSHIP_PRICE=.04;
export const hardshipLP=h=>1+HARDSHIP_LP*Math.max(0,h);
export const HARDSHIP_TEXT=h=>h?`Prosperity −${h*HARDSHIP_PROSPERITY}, Market Hall prices +${Math.round(h*HARDSHIP_PRICE*100)}%, Unrest starts sooner · Legacy Points +${Math.round(h*HARDSHIP_LP*100)}%`:'The standard chronicle.';

// What the founding panel may offer from this profile.
export function foundingOptions(legacy){
  const l=normalizeLegacy(legacy);
  return {founders:Object.keys(FOUNDER_INDEX).filter(id=>founderOpen(l,id)),artifacts:[...l.artifacts],slots:artifactSlots(l),
    boosters:Object.entries(l.boosters).filter(([,n])=>n>0).map(([id,n])=>({id,count:n})),maxHardship:l.hardship,boosterLimit:BOOSTERS_PER_CITY};
}
// Clamp a requested setup to what the profile owns.
export function validSetup(legacy,setup={}){
  const o=foundingOptions(legacy);
  const founder=o.founders.includes(setup.founder)?setup.founder:'wanderer';
  const artifacts=Array.from(new Set((setup.artifacts||[]).filter(id=>o.artifacts.includes(id)))).slice(0,o.slots);
  const stock={...normalizeLegacy(legacy).boosters},boosters=[];
  for(const id of setup.boosters||[]){if(boosters.length>=o.boosterLimit)break;if((stock[id]||0)>0){stock[id]--;boosters.push(id);}}
  const hardship=Math.max(0,Math.min(o.maxHardship,Math.floor(Number(setup.hardship)||0)));
  return {founder,artifacts,boosters,hardship};
}

const hash=(...a)=>{let h=2166136261;for(const v of a){for(const ch of String(v)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}}return h>>>0;};
const rng=n=>()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
const pick=(list,r)=>list.length?list[Math.floor(r()*list.length)]:null;

// Legacy Market percentages compound over 730 years of a doctrine city, so
// runs take them at ERA_LEGACY_SCALE (exit test 7: the fifth run of a steady
// profile scores 1.2–1.6× the first). Rule-bending ranks count in full.
export const ERA_LEGACY_SCALE=.25;
const PERCENT_KEYS=['treasury','development','newHousing','trade','arts','migration','services','legacyCapacity','legacyProductivity'];
export function eraLegacyBonuses(bonuses={}){const out={...bonuses};for(const k of PERCENT_KEYS)if(Number.isFinite(out[k]))out[k]=Math.round(out[k]*ERA_LEGACY_SCALE*10000)/10000;return out;}
// Turn a fresh city into a run. Returns {city, legacy} with boosters spent.
// `featured` are the featured historical figures chosen on the founding page.
export function foundRun(city,legacy,setup={},featured=[]){
  const l=normalizeLegacy(legacy),s=validSetup(l,setup),profile=startRunProfile(l,featured),pool=eraCardPool(l);
  const founder=FOUNDER_INDEX[s.founder],r=rng(hash(city.seed,'founding',s.founder,s.boosters.join('|')));
  // Perks: artifacts plus the founder's doctrine favour and the Hardship price rise.
  const perks={};
  for(const id of s.artifacts)for(const [k,v] of Object.entries(ARTIFACT_INDEX[id].perks)){
    perks[k]=['priceMult','unrestMult','startFunds'].includes(k)?(perks[k]||1)*v:(perks[k]||0)+v;}
  if(founder.doctrine)perks.favour=founder.doctrine;
  if(s.hardship)perks.priceMult=(perks.priceMult||1)*(1+HARDSHIP_PRICE*s.hardship);
  let funds=city.funds*(founder.startFunds||1)*(perks.startFunds||1);
  // Starting hand: the founder's cards. Artifacts and boosters add offers to
  // the first Market Hall instead (bought at the usual price).
  const inPool=c=>c&&pool.includes(c.id)&&c.kind!=='figure';
  const startCards=[...founder.cards.filter(id=>inPool(CARD_INDEX[id]))],offers=[];
  const early=c=>(c.minYear??1300)<=1400,fresh=c=>!startCards.includes(c.id)&&!offers.includes(c.id);
  const add=list=>{const c=pick(list.filter(fresh),r);if(c)offers.push(c.id);};
  if(perks.startUncommon)add(ERA_CARDS.filter(c=>inPool(c)&&c.rarity==='uncommon'&&early(c)));
  for(const b of s.boosters){
    if(b==='purse')funds*=1.1;
    else if(b==='bundle'){const d=founder.doctrine||pick(DOCTRINE_IDS,r);
      for(let i=0;i<2;i++)add(ERA_CARDS.filter(c=>inPool(c)&&['common','uncommon'].includes(c.rarity)&&early(c)&&cardDoctrines(c).includes(d)));}
    else if(b==='sealed')add(ERA_CARDS.filter(c=>inPool(c)&&c.rarity==='rare'&&cardType(c)!=='patron'));
  }
  if(offers.length)perks.firstOffers=offers;
  const deck={...deckOf(city)};let uid=deck.nextUid||1;
  deck.hand=[...deck.hand,...startCards.map(cardId=>({uid:uid++,cardId,paid:0}))];deck.nextUid=uid;
  const effectsTimed=[...(city.effectsTimed||[])];
  if(s.hardship)effectsTimed.push({source:'hardship',label:`Hardship ${s.hardship}`,until:99999,effects:{prosperity:-HARDSHIP_PROSPERITY*s.hardship}});
  const next={...city,funds:Math.round(funds),deck,effectsTimed,eventsOn:true,needsOn:true,legacyBonuses:eraLegacyBonuses(profile.legacyBonuses),
    founder:s.founder,artifacts:s.artifacts,boostersUsed:s.boosters,hardship:s.hardship,perks,unrest:0,peakTiers:{},
    turning:{...city.turning,mode:'era',cardPool:pool,figurePool:profile.figurePool,featuredFigures:profile.featuredFigures}};
  // A town seeded before founding already has its first Market Hall: restock it with the bonus offers.
  if(offers.length&&next.deck.shop)next.deck=restockShop({...next,deck:{...next.deck,shop:null}},stats(next)).deck;
  const boosters={...l.boosters};for(const b of s.boosters)boosters[b]=Math.max(0,(boosters[b]||0)-1);
  return {city:next,legacy:{...l,boosters},setup:s};
}

// ───────────── Recording a run ─────────────
// Best tier per doctrine reached at any point (sim keeps peakTiers yearly).
export function runTiers(city){
  const out={...(city.peakTiers||{})},counts=doctrineState(city).counts||{};
  for(const d of DOCTRINE_IDS)out[d]=Math.max(out[d]||0,tierOf(counts[d]||0));
  return out;
}
export const RUIN_SHARE=.5;
// Pay Legacy Points, raise mastery and Hardship, and add the run to history.
// Idempotent per city id. Returns {legacy, run, unlocked}.
export function recordRun(legacy,city,stats){
  const l=normalizeLegacy(legacy);
  if(!city?.finished||l.completed.includes(city.id))return {legacy:l,run:l.runs.find(r=>r.id===city?.id)||null,unlocked:[]};
  const reward=scoreCity(city,stats),h=Math.max(0,Math.floor(city.hardship||0)),ruined=!!city.ruined;
  const points=Math.round(reward.points*(ruined?RUIN_SHARE:1)*hardshipLP(h));
  const tiers=runTiers(city),mastery={...l.mastery},unlocked=[];
  for(const d of DOCTRINE_IDS){const before=mastery[d]||0,t=Math.max(before,tiers[d]||0);
    if(t>before){for(let k=before+1;k<=t;k++)for(const id of masteryUnlocks(d,k))unlocked.push(id);mastery[d]=t;}}
  const top=DOCTRINE_IDS.reduce((a,d)=>(tiers[d]||0)>(tiers[a]||0)?d:a,DOCTRINE_IDS[0]);
  const run={id:city.id,name:city.name,type:city.type,founder:city.founder||'wanderer',hardship:h,ruined:ruined?city.ruined:null,
    year:city.year,score:Math.round(city.score?.total||0),population:Math.round(stats.population||0),prosperity:Math.round(stats.prosperity||0),
    doctrine:(tiers[top]||0)>0?top:null,tier:tiers[top]||0,lp:points,at:Date.now()};
  const hardship=!ruined&&h>=l.hardship?Math.min(MAX_HARDSHIP,h+1):l.hardship;
  const next={...l,points:l.points+points,lifetimePoints:l.lifetimePoints+points,completed:[...l.completed,city.id],
    achievements:Array.from(new Set([...l.achievements,...reward.achievements])),mastery,hardship,runs:[...l.runs,run].slice(-RUNS_KEPT)};
  return {legacy:next,run,unlocked:Array.from(new Set(unlocked))};
}

// ───────────── Comparisons ─────────────
// Approximate historical populations (city proper, rounded; sources vary
// widely before 1800). For a sense of scale, not a precise record.
export const HISTORIC_CITIES=[
  {id:'bruges',name:'Bruges',points:[[1300,40000],[1500,30000],[1800,32000],[1900,53000],[2030,118000]]},
  {id:'florence',name:'Florence',points:[[1300,100000],[1350,45000],[1500,70000],[1800,80000],[1900,205000],[1950,375000],[2030,365000]]},
  {id:'venice',name:'Venice',points:[[1300,110000],[1500,115000],[1600,150000],[1800,138000],[1950,320000],[2030,255000]]},
  {id:'amsterdam',name:'Amsterdam',points:[[1300,1000],[1500,12000],[1650,175000],[1800,200000],[1900,510000],[1960,870000],[2030,930000]]},
  {id:'paris',name:'Paris',points:[[1300,200000],[1500,225000],[1700,510000],[1800,550000],[1900,2700000],[2030,2100000]]},
  {id:'london',name:'London',points:[[1300,80000],[1500,50000],[1700,575000],[1800,960000],[1900,6500000],[2030,9000000]]}
];
export function historicPopulation(cityDef,year){
  const p=cityDef.points;if(year<=p[0][0])return p[0][1];
  for(let i=1;i<p.length;i++)if(year<=p[i][0]){const [y0,v0]=p[i-1],[y1,v1]=p[i],t=(year-y0)/(y1-y0);return Math.round(v0+(v1-v0)*t);}
  return p.at(-1)[1];
}
// Where a population sits among the historical cities in the same year.
export function historicStanding(population,year){
  const rows=HISTORIC_CITIES.map(c=>({id:c.id,name:c.name,population:historicPopulation(c,year)})).sort((a,b)=>a.population-b.population);
  const below=rows.filter(r=>r.population<=population),above=rows.filter(r=>r.population>population);
  return {rows,passed:below.at(-1)||null,next:above[0]||null,passedCount:below.length};
}
// This run against your past ones (by score).
export function runStanding(legacy,run){
  const runs=normalizeLegacy(legacy).runs,others=runs.filter(r=>r.id!==run.id);
  const best=others.reduce((m,r)=>Math.max(m,r.score),0),previous=others.at(-1)||null;
  const rank=1+others.filter(r=>r.score>run.score).length;
  return {count:others.length+1,rank,best,previous,record:run.score>best&&others.length>0,first:others.length===0};
}
export const doctrineName=d=>DOCTRINES[d]?.name||'Civic';
