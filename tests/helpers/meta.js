// v2.0 scripted meta player for the R3 exit tests: plays a run on a profile,
// records it, then spends its Legacy Points the way a steady player would.
import {runStrategy,newCity} from './strategies.js';
import {recordRun} from '../../src/runs.js';
import {stats} from '../../src/sim.js';
import {MARKET_UPGRADES,ARTIFACTS,BOOSTERS,canBuy,buyLegacy,normalizeLegacy,artifactSlots} from '../../src/legacy.js';

// One run on a profile: found with `setup`, play `strategy`, record it.
export function playRun(legacy,{seed=7,type='river',strategy='opportunist',setup={}}={}){
  const start=newCity(seed,type,{legacy,setup,withLegacy:true});
  const r=runStrategy(strategy,seed,2030,type,{city:start.city});
  const city=r.city.finished?r.city:{...r.city,finished:true};
  const out=recordRun(start.legacy,city,stats(city));
  return {...out,result:r};
}
// Spending policy: cheapest affordable item first, preferring the run-shaping
// ones (upgrades that bend rules, artifacts), then a booster to use next run.
export function spendLegacy(legacy){
  let l=normalizeLegacy(legacy);
  for(let guard=0;guard<40;guard++){
    const items=[...MARKET_UPGRADES.map(u=>['upgrade',u.id]),...ARTIFACTS.map(a=>['artifact',a.id])]
      .map(([type,id])=>({type,id,check:canBuy(l,type,id)})).filter(x=>x.check.ok).sort((a,b)=>a.check.cost-b.check.cost);
    if(!items.length)break;
    l=buyLegacy(l,items[0].type,items[0].id);
  }
  for(const b of BOOSTERS)if(canBuy(l,'booster',b.id).ok)l=buyLegacy(l,'booster',b.id);
  return l;
}
// The setup a steady player picks: their best artifacts and the boosters in store.
export function steadySetup(legacy,founder='wanderer'){
  const l=normalizeLegacy(legacy);
  const boosters=Object.entries(l.boosters).flatMap(([id,n])=>Array(n).fill(id)).slice(0,2);
  return {founder,artifacts:l.artifacts.slice(0,artifactSlots(l)),boosters,hardship:0};
}
