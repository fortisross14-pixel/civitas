// Grows the start cities of the scenarios (src/scenarios.js) with a scripted
// player and writes them to public/scenarios/<id>.json. Same seed, same city.
// Run after engine changes: node scripts/build-scenarios.mjs [id …]
import {writeFileSync,mkdirSync} from 'node:fs';
import {makeCity,seedTown,advance,stats,zoneLand,cityOrigin,buildWall} from '../src/sim.js';
import {foundRun} from '../src/runs.js';
import {emptyLegacy} from '../src/legacy.js';
import {takeTurn} from '../tests/helpers/strategies.js';
import {SCENARIOS} from '../src/scenarios.js';

// How each start city grows: which scripted player, and an opened card pool
// (as if that doctrine had been mastered) so the city looks its part.
const GROW={
  black_year:{strategy:'opportunist',founder:'reeve'},
  pilgrim_road:{strategy:'focused:faith',founder:'abbess',mastery:{faith:2}},
  canal_city:{strategy:'focused:trade',founder:'merchant',mastery:{trade:2}},
  mill_abbey:{strategy:'focused:faith',founder:'abbess',mastery:{faith:2}},
  ensanche:{strategy:'opportunist',founder:'wanderer',wall:1500,zoneScale:.6},
  rebuilding:{strategy:'focused:industry',founder:'millwright',mastery:{industry:2}},
  new_century:{strategy:'focused:industry',founder:'millwright',mastery:{industry:2}}
};
export function growStartCity(def,g){
  const legacy={...emptyLegacy(),mastery:g.mastery||{},founders:['millwright','painter','scholar','reeve']};
  // A finished scenario tag while growing, so the scenario's rules (keepWalls) already hold.
  let c={...foundRun(seedTown(makeCity(def.name,def.type,def.seed)),legacy,{founder:g.founder}).city,scenario:{id:def.id,done:true,met:[],fired:[]}},i=0;
  while(c.year<def.from&&!c.finished){
    c=advance(c,Math.min(5,def.from-c.year));
    if(c.turning?.pending||c.event||true)c=takeTurn(g.strategy,c);
    if(g.wall&&c.year>=g.wall&&!(c.walls||[]).length){const w=buildWall({...c,funds:Math.max(c.funds,1e7)});if(w?.city)c={...w.city,funds:c.funds};}
    if(c.year%20===0){const o=cityOrigin(c),s=stats(c),R=6+Math.sqrt(s.population)/12*(g.zoneScale||1),a=(i++)*2.3;
      for(const [t,w,h] of [['craft',8,6],['res',10,8]]){const ang=a+(t==='res'?1.5:0);const r=zoneLand(c,Math.round(o.x+Math.cos(ang)*R-w/2),Math.round(o.y+Math.sin(ang)*R-h/2),w,h,t);if(!r.error)c=r.city;}}
  }
  if(c.turning?.pending)c=takeTurn(g.strategy,c);
  // Slim: no timelapse snapshots, recent events only.
  const {scenario,...out}=c;
  return {...out,snapshots:[],events:c.events.slice(-30),finished:false};
}
const only=process.argv.slice(2);
mkdirSync(new URL('../public/scenarios/',import.meta.url),{recursive:true});
for(const def of SCENARIOS){
  if(def.start.from==='fresh'||(only.length&&!only.includes(def.id)))continue;
  const t=Date.now(),c=growStartCity(def,GROW[def.id]),s=stats(c);
  writeFileSync(new URL(`../public/scenarios/${def.id}.json`,import.meta.url),JSON.stringify(c));
  console.log(def.id,c.year,'pop',s.population,'industry',s.sectorJobs.craft,'faith',s.religiousInfluence,'culture',s.culturalPrestige,'learning',s.educationIndex,'prosp',s.prosperity,'walls',(c.walls||[]).length,`${((Date.now()-t)/1000).toFixed(1)}s`);
}
