// v1.6 scripted players for the Milestone C exit test (and balance work).
// passive: founds the town and never touches it again. History goes undecided.
// sensible: every five years builds the cheapest building that answers each
//   need at the need's spot, answers history with the first response, and buys
//   and plays the cheapest card it can comfortably afford.
import {makeCity,seedTown,advance,selectTurningPoint,stats,placeConstruction,playCard} from '../../src/sim.js';
import {needsOf,needAnswers} from '../../src/needs.js';
import {omensOf,answerOmen} from '../../src/events.js';
import {buyCard,deckOf} from '../../src/cards.js';
import {scoreOf} from '../../src/score.js';

export function newCity(seed,type='river'){const c=seedTown(makeCity('Strategy '+seed,type,seed));return {...c,eventsOn:true,needsOn:true,turning:{...c.turning,mode:'era'}};}

// Try parcels in rings around (x, y) until one accepts the building.
export function buildNear(city,id,x,y,maxRadius=7){
  for(let r=0;r<=maxRadius;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    const out=placeConstruction(city,id,Math.floor(x)+dx,Math.floor(y)+dy);
    if(!out.error)return out.city;
  }
  return null;
}

function sensibleTurn(c){
  for(const n of needsOf(c)){if(n.served)continue;
    const options=needAnswers(n.kind,c.year).filter(b=>b.cost<=c.funds).sort((a,b)=>a.cost-b.cost);
    for(const b of options){const built=buildNear(c,b.id,n.x,n.y);if(built){c=built;break;}}
  }
  for(const o of omensOf(c))if(o.choice==null){const r=answerOmen(c,o.id,0);if(!r.error)c=r.city;}
  const offer=[...(deckOf(c).shop?.offers||[])].sort((a,b)=>a.price-b.price)[0];
  if(offer&&c.funds>=offer.price*3){const b=buyCard(c,offer.uid);if(!b.error){const p=playCard(b.city,offer.uid);c=p.error?b.city:p.city;}}
  return c;
}

export function runStrategy(strategy,seed,until=2030,type='river'){
  let c=newCity(seed,type),n=0;
  while(c.year<until&&!c.finished&&n++<400){
    c=advance(c,Math.min(5,until-c.year));
    if(c.turning?.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);
    if(strategy==='sensible')c=sensibleTurn(c);
  }
  const s=stats(c),score=scoreOf(c);
  return {strategy,seed,year:c.year,population:s.population,prosperity:s.prosperity,score:Math.round(score.total),lost:Math.round(score.lost),declines:c.declines||0,
    undecided:c.events.filter(e=>e.undecided).length,answered:c.events.filter(e=>e.type==='history'&&!e.undecided).length,city:c};
}
