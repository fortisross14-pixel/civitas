// v2.0 Milestone R3: runs and meta. Card pool and mastery, Founders,
// artifacts, boosters, Ruin, Hardships, Era Trials, the run record and the
// Milestone R exit tests 3–8 (docs/ROADMAP.md). Exit test 7 (the fifth run
// scores 1.2–1.6× the first) needs many seeds: `npm run balance:runs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLegacy,normalizeLegacy,buyLegacy,canBuy,FOUNDERS,LOCKED_CARDS} from '../src/legacy.js';
import {eraCardPool,cardUnlocked,foundRun,validSetup,recordRun,runTiers,historicStanding,historicPopulation,HISTORIC_CITIES,runStanding,hardshipLP} from '../src/runs.js';
import {ERA_CARDS,CARD_INDEX} from '../src/turningPoints.js';
import {cardType,cardDoctrines,decreeSlots,DOCTRINE_IDS} from '../src/doctrines.js';
import {deckOf,handLimit,rerollPrice,shopEligible,cardPrice} from '../src/cards.js';
import {advance,stats,makeCity,seedTown,unrestLine,RUIN_AT,normalizeCity} from '../src/sim.js';
import {trialDefinition,maybeTrial,omensOf,answerOmen,TRIAL_LEAD} from '../src/events.js';
import {isQuiet,runMinutes,NORMAL_SPEED} from '../src/pacing.js';
import {newCity,runStrategy,takeTurn} from './helpers/strategies.js';

const mastered=()=>({...emptyLegacy(),mastery:Object.fromEntries(DOCTRINE_IDS.map(d=>[d,2]))});
const fresh=(seed=7,setup={},legacy=emptyLegacy())=>foundRun(seedTown(makeCity('Run '+seed,'river',seed)),legacy,setup);

// ───────────── Card pool ─────────────
test('a fresh profile gets the Starter Pool: doctrine cards included, no Rares of a doctrine, no Patrons',()=>{
  const pool=eraCardPool(emptyLegacy());
  // The v1.9.1 production bug: the founding pool listed classic cards only, so doctrine-only cards were never offered.
  for(const id of ['tithe_barn','water_mill','painters_guild','almanac','toll_bridge','b_chapel'])assert.ok(pool.includes(id),id);
  for(const id of pool){const c=CARD_INDEX[id];assert.notEqual(cardType(c),'patron',id);
    if(cardDoctrines(c).length)assert.ok(['common','uncommon'].includes(c.rarity),`${id} is ${c.rarity}`);}
  assert.ok(pool.length>=50&&pool.length<ERA_CARDS.length,`${pool.length}`);
});
test('the founded city really offers doctrine-only cards in its Market Hall',()=>{
  const {city}=fresh(7);
  assert.ok(shopEligible(CARD_INDEX.tithe_barn,city));
  let c=city,seen=new Set();for(let i=0;i<12;i++){c=advance(c,10);for(const o of deckOf(c).shop?.offers||[])seen.add(o.cardId);}
  assert.ok([...seen].some(id=>CARD_INDEX[id].eraOnly),'an era-only card appeared in 120 years');
});
test('mastery opens a doctrine: tier 1 its Rares (classic Legacy cards too), tier 2 its Epics and Patron',()=>{
  const t1=eraCardPool({mastery:{faith:1}}),t2=eraCardPool({mastery:{faith:2}}),base=eraCardPool({});
  assert.ok(t1.includes('great_pilgrimage')&&!base.includes('great_pilgrimage'));
  assert.ok(!t1.includes('sacred_city')&&t2.includes('sacred_city'));
  assert.ok(t2.some(id=>cardType(CARD_INDEX[id])==='patron'&&cardDoctrines(CARD_INDEX[id]).includes('faith')));
  // Hybrids need both doctrines.
  assert.ok(!t2.includes('cathedral_school')||cardUnlocked(CARD_INDEX.cathedral_school,{mastery:{faith:2}}));
  assert.ok(eraCardPool(mastered()).length>=ERA_CARDS.length-LOCKED_CARDS.filter(id=>CARD_INDEX[id]&&!cardDoctrines(CARD_INDEX[id]).length).length);
  // Buying a classic card in the Legacy Market still opens it.
  assert.ok(eraCardPool({unlockedCards:['great_pilgrimage']}).includes('great_pilgrimage'));
});

// ───────────── Founding ─────────────
test('a Founder brings two starting cards and favours their doctrine; locked founders fall back to the Wanderer',()=>{
  const {city}=fresh(7,{founder:'abbess'});
  assert.deepEqual(deckOf(city).hand.map(c=>c.cardId),['b_chapel','tithe_barn']);
  assert.equal(city.perks.favour,'faith');assert.equal(city.turning.mode,'era');assert.ok(city.needsOn&&city.eventsOn);
  assert.equal(validSetup(emptyLegacy(),{founder:'scholar'}).founder,'wanderer');
  assert.equal(validSetup({mastery:{learning:1}},{founder:'scholar'}).founder,'scholar');
  const bought=buyLegacy({...emptyLegacy(),points:500},'founder','painter');
  assert.ok(bought.founders.includes('painter')&&bought.points===380);
  assert.equal(FOUNDERS.filter(f=>f.free).length,3);
});
test('artifacts are owned, limited by slots, and bend their rule',()=>{
  let l={...emptyLegacy(),points:5000};
  for(const id of ['bell','chain','scales'])l=buyLegacy(l,'artifact',id);
  assert.equal(canBuy(l,'artifact','bell').ok,false);
  assert.deepEqual(validSetup(l,{artifacts:['bell','chain','nope']}).artifacts,['bell']);
  const base=fresh(7).city,belled=fresh(7,{artifacts:['bell']},l).city;
  assert.equal(decreeSlots(belled),decreeSlots(base)+1);
  l=buyLegacy(l,'upgrade','vault');
  const chained=fresh(7,{artifacts:['chain','scales']},l).city;
  assert.equal(rerollPrice(chained),0,'first reroll of the decade is free');
  const card=CARD_INDEX.b_market;assert.ok(cardPrice(card,100,chained)<cardPrice(card,100,base),'Merchant’s Scales lower prices');
  l=buyLegacy(l,'upgrade','satchel');
  assert.equal(handLimit(foundRun(seedTown(makeCity('x','river',7)),l,{}).city),handLimit(base)+1);
});
test('boosters are used up at founding and add offers to the first Market Hall',()=>{
  const l={...emptyLegacy(),boosters:{bundle:1,sealed:1,purse:2}};
  const out=fresh(7,{founder:'merchant',boosters:['bundle','sealed','purse']},l);
  assert.deepEqual(out.setup.boosters,['bundle','sealed'],'two per city');
  assert.equal(out.legacy.boosters.bundle,0);assert.equal(out.legacy.boosters.sealed,0);assert.equal(out.legacy.boosters.purse,2);
  const offers=deckOf(out.city).shop.offers.map(o=>CARD_INDEX[o.cardId]);
  assert.equal(offers.length,3+3);
  assert.ok(offers.filter(c=>cardDoctrines(c).includes('trade')).length>=2);
  assert.ok(offers.some(c=>c.rarity==='rare'));
  const purse=fresh(7,{boosters:['purse']},l).city,plain=fresh(7).city;
  assert.ok(purse.funds>plain.funds);
});

// ───────────── Hardship, Ruin, records ─────────────
test('Hardship lowers prosperity, raises prices and the Unrest line, and pays more LP',()=>{
  const l={...emptyLegacy(),hardship:4};
  assert.equal(validSetup(l,{hardship:9}).hardship,4);
  const hard=fresh(7,{hardship:3},l).city,easy=fresh(7,{},l).city;
  assert.ok(stats(hard).prosperity<stats(easy).prosperity);
  assert.ok(deckOf(hard).shop.offers[0].price>=deckOf(easy).shop.offers[0].price);
  assert.equal(unrestLine(hard),unrestLine(easy)+6);
  assert.ok(Math.abs(hardshipLP(3)-1.45)<1e-9);
});
test('a ruined city stays finished when reloaded',()=>{
  const c=normalizeCity({...fresh(7).city,ruined:1400,year:1400});
  assert.equal(c.finished,true);
});
test('recordRun pays LP once, raises mastery and opens the next Hardship',()=>{
  const r=runStrategy('focused:faith',7,1600,'river',{legacy:emptyLegacy()});
  const city={...r.city,finished:true},s=stats(city);
  const tiers=runTiers(city);assert.ok(tiers.faith>=1);
  const out=recordRun(emptyLegacy(),city,s);
  assert.ok(out.legacy.points>0&&out.run.lp===out.legacy.points);
  assert.equal(out.legacy.mastery.faith,tiers.faith);
  assert.ok(out.unlocked.length>0);
  assert.equal(out.legacy.hardship,1);assert.equal(out.legacy.runs.length,1);
  assert.equal(recordRun(out.legacy,city,s).legacy.points,out.legacy.points,'idempotent');
  const ruined=recordRun(emptyLegacy(),{...city,id:'r2',ruined:1500},s);
  assert.ok(Math.abs(ruined.run.lp-out.run.lp/2)<=1);
  assert.equal(ruined.legacy.hardship,0,'a ruined run opens no Hardship');
  assert.equal(normalizeLegacy(JSON.parse(JSON.stringify(out.legacy))).runs.length,1,'survives storage');
});
test('the summary compares with past runs and historical cities',()=>{
  assert.equal(historicPopulation(HISTORIC_CITIES.find(c=>c.id==='amsterdam'),1650),175000);
  const st=historicStanding(150000,1500);assert.equal(st.passed.name,'Venice');assert.equal(st.next.name,'Paris');
  const l={...emptyLegacy(),runs:[{id:'a',name:'A',score:100},{id:'b',name:'B',score:300},{id:'c',name:'C',score:200}]};
  const s=runStanding(l,l.runs[2]);assert.equal(s.rank,2);assert.equal(s.best,300);assert.equal(s.previous.name,'B');
});

// ───────────── Era Trials ─────────────
test('an Era Trial offers a doctrine answer from tier 2; answering it improves the next draft',()=>{
  assert.equal(trialDefinition('trial:1500:none').choices.length,2);
  assert.equal(trialDefinition('trial:1500:faith').choices.length,3);
  assert.ok(trialDefinition('trial:1500:faith').choices[2].boon);
  let c=runStrategy('focused:faith',11,1490,'river').city;
  assert.ok(maybeTrial({...c,omens:[],seenEvents:[]},1500-1-TRIAL_LEAD,1500,'faith'));
  while(c.year<1499&&!omensOf(c).some(o=>o.id.startsWith('trial:')))c=advance(c,1);
  const trial=omensOf(c).find(o=>o.id.startsWith('trial:1500'));
  assert.ok(trial,'trial announced before the 1500 draft');assert.equal(trial.due,1499);
  assert.ok(trial.id.endsWith(':faith'),trial.id);
  c=answerOmen(c,trial.id,2).city;
  while(!c.turning.pending&&c.year<1501)c=advance(c,1);
  assert.ok(c.turning.pending?.boon);
  assert.equal(c.turning.pending.options.length,4);
});

// ───────────── Milestone R exit tests 3–6 and 8 ─────────────
test('R exit 4: a first run cannot reach Patrons or Wonders',()=>{
  for(const d of ['faith','arts']){
    const c=runStrategy(`focused:${d}`,7,2030,'river',{legacy:emptyLegacy()}).city;
    assert.ok(!c.turning.choices.some(p=>cardType(CARD_INDEX[p.cardId])==='patron'),d);
    assert.equal((c.wonders||[]).length,0,d);
  }
});
test('R exit 3: runs with different Founders share at most 40% of their cards',()=>{
  const sets=['abbess','merchant','scholar'].map(f=>new Set(runStrategy('opportunist',7,2030,'river',{legacy:mastered(),setup:{founder:f}}).city.turning.choices.map(p=>p.cardId)));
  const shares=[];for(let i=0;i<sets.length;i++)for(let j=i+1;j<sets.length;j++){const a=sets[i],b=sets[j];shares.push([...a].filter(x=>b.has(x)).length/new Set([...a,...b]).size);}
  const mean=shares.reduce((a,b)=>a+b,0)/shares.length;
  assert.ok(mean<=.4,`mean share ${mean.toFixed(2)} (${shares.map(s=>s.toFixed(2))})`);
});
// One scripted run, year by year: decision cadence and the run's length.
const paced=(()=>{let cache=null;return()=>{if(cache)return cache;
  let c=newCity(7,'river',{legacy:emptyLegacy(),setup:{founder:'abbess'}}),quiet=0,years=0;const decisions=[1300];
  while(!c.finished&&c.year<2030){const n=c.events.length;c=advance(c,1);years++;if(isQuiet(c))quiet++;
    if(c.events.slice(n).some(e=>['shop','omen','turning_point','need'].includes(e.type))||c.turning?.pending)decisions.push(c.year);
    if(c.year%5===0||c.turning?.pending)c=takeTurn('opportunist',c);}
  return cache={c,quiet:quiet/years,years,decisions};};})();
test('R exit 5: a meaningful choice at least every 90 seconds at normal speed',()=>{
  const {decisions,c}=paced(),secondsPerYear=12/NORMAL_SPEED;
  const gaps=decisions.slice(1).map((y,i)=>y-decisions[i]).concat(c.year-decisions.at(-1));
  assert.ok(Math.max(...gaps)*secondsPerYear<=90,`longest gap ${Math.max(...gaps)} years`);
});
test('R exit 6: the passive player survives Hardship 0 and is ruined by Hardship 5',()=>{
  for(const seed of [7,11,3]){
    assert.ok(!runStrategy('passive',seed,2030,'river',{hardship:0}).city.ruined,`H0 seed ${seed}`);
    const r=runStrategy('passive',seed,2030,'river',{hardship:5}).city;
    assert.ok(r.ruined&&r.finished&&(r.unrest>=RUIN_AT),`H5 seed ${seed}`);
  }
});
test('R exit 8: a run lasts 15–22 minutes at normal speed',()=>{
  const {quiet,years}=paced(),m=runMinutes(NORMAL_SPEED,quiet,years);
  assert.ok(m>=15&&m<=22,`${m.toFixed(1)} minutes (quiet share ${quiet.toFixed(2)})`);
});
test('every card in the doctrine pool has a known domain (the UI colours cards by it)',async()=>{
  const {DOMAINS}=await import('../src/turningPoints.js');
  for(const c of ERA_CARDS)assert.ok(DOMAINS[c.domain],`${c.id}: ${c.domain}`);
});
