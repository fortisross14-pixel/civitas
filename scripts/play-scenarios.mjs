// Plays every scenario with scripted players and prints stars and goal values.
// node scripts/play-scenarios.mjs [strategy …] [--trinkets=a+b]
import {readFileSync,existsSync} from 'node:fs';
import {advance,stats,zoneLand,cityOrigin} from '../src/sim.js';
import {emptyLegacy} from '../src/legacy.js';
import {takeTurn} from '../tests/helpers/strategies.js';
import {SCENARIOS,GOAL_STATS,goalTarget} from '../src/scenarios.js';
import {startScenario} from '../src/scenarioStart.js';
import {TRINKETS} from '../src/trinkets.js';
export function playScenario(id,strategy,{trinkets=[],zone=true}={}){
  const path=new URL(`../public/scenarios/${id}.json`,import.meta.url),pre=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null;
  const legacy={...emptyLegacy(),trinkets:TRINKETS.map(t=>t.id)};
  let {city:c}=startScenario(id,legacy,{trinkets},pre,()=>.5),i=0,n=0;
  while(!c.finished&&n++<200){c=advance(c,5);if(strategy!=='passive')c=takeTurn(strategy,c);else if(c.turning?.pending)c=takeTurn('sensible',c);
    if(zone&&strategy!=='passive'&&c.year%20===0){const o=cityOrigin(c),s=stats(c),R=6+Math.sqrt(s.population)/12,a=(i++)*2.3;
      for(const [t,w,h] of [['craft',8,6],['res',10,8]]){const ang=a+(t==='res'?1.5:0);const r=zoneLand(c,Math.round(o.x+Math.cos(ang)*R-w/2),Math.round(o.y+Math.sin(ang)*R-h/2),w,h,t);if(!r.error)c=r.city;}}}
  return c;
}
if(import.meta.url===`file://${process.argv[1]}`){
  const args=process.argv.slice(2),tk=(args.find(a=>a.startsWith('--trinkets='))||'').slice(11),strategies=args.filter(a=>!a.startsWith('--'));
  for(const def of SCENARIOS)for(const st of strategies.length?strategies:['passive','sensible','opportunist']){
    const c=playScenario(def.id,st,{trinkets:tk?tk.split('+'):[]}),s=stats(c),sc=c.scenario;
    console.log(def.id.padEnd(13),st.padEnd(16),'★'.repeat(sc.stars).padEnd(3),def.goals.map((g,k)=>`${g.stat} ${GOAL_STATS[g.stat].read(s)}/${goalTarget(g,sc)}${sc.met[k]?'@'+sc.met[k]:''}`).join(' · '),c.year);
  }
}
