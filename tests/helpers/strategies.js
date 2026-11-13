// v1.6 scripted players for the Milestone C exit test (and balance work).
// passive: founds the town and never touches it again. History goes undecided.
// sensible: every five years builds the cheapest building that answers each
//   need at the need's spot, answers history with the first response, and buys
//   and plays the cheapest card it can comfortably afford.
import {makeCity,seedTown,advance,selectTurningPoint,stats,placeConstruction,playCard,cityOrigin} from '../../src/sim.js';
import {needsOf,needAnswers} from '../../src/needs.js';
import {omensOf,answerOmen} from '../../src/events.js';
import {buyCard,deckOf,rerollShop,rerollPrice} from '../../src/cards.js';
import {scoreOf} from '../../src/score.js';
import {cardDoctrines,DOCTRINE_IDS,doctrineState} from '../../src/doctrines.js';
import {CARD_INDEX} from '../../src/turningPoints.js';

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

// Shared by every scripted player: place awarded projects, build what needs
// ask for, answer history.
function placeProjects(c){
  for(const p of [...(c.projects||[])]){
    const need=needsOf(c).find(n=>!n.served),o=need||cityOrigin(c);
    const built=buildNear(c,p.id,o.x,o.y,12);if(built)c=built;
  }
  return c;
}
function tendCity(c){
  c=placeProjects(c);
  for(const n of needsOf(c)){if(n.served)continue;
    const options=needAnswers(n.kind,c.year).filter(b=>b.cost<=c.funds).sort((a,b)=>a.cost-b.cost);
    for(const b of options){const built=buildNear(c,b.id,n.x,n.y);if(built){c=built;break;}}
  }
  for(const o of omensOf(c))if(o.choice==null){const r=answerOmen(c,o.id,0);if(!r.error)c=r.city;}
  return c;
}
function sensibleTurn(c){
  c=tendCity(c);
  const offer=[...(deckOf(c).shop?.offers||[])].sort((a,b)=>a.price-b.price)[0];
  if(offer&&c.funds>=offer.price*3){const b=buyCard(c,offer.uid);if(!b.error){const p=playCard(b.city,offer.uid);c=p.error?b.city:p.city;}}
  return c;
}

// v1.8 doctrine players. focused:<doctrine> buys and drafts only that doctrine;
// spread buys whichever doctrine it holds least of. Same budget rule for both.
const tags=id=>cardDoctrines(CARD_INDEX[id]);
function preferFor(strategy,c){
  if(strategy.startsWith('focused:')){const d=strategy.slice(8);return id=>tags(id).includes(d)?2:0;}
  if(strategy==='spread'){const counts=doctrineState(c).counts;return id=>{const t=tags(id);if(!t.length)return 0;return 2-Math.min(...t.map(d=>counts[d]||0))/4;};}
  return ()=>1;
}
function doctrineTurn(strategy,c){
  c=tendCity(c);const prefer=preferFor(strategy,c);
  let rerolled=false;
  for(let k=0;k<2;k++){
    let offers=[...(deckOf(c).shop?.offers||[])].filter(o=>prefer(o.cardId)>0).sort((a,b)=>prefer(b.cardId)-prefer(a.cardId)||a.price-b.price);
    // Nothing for my build: pay once a decade for a new selection, as a player would.
    if(!offers.length&&!rerolled&&strategy.startsWith('focused:')&&deckOf(c).shop&&c.funds>=rerollPrice(c)*4){const r=rerollShop(c,stats(c));rerolled=true;if(!r.error){c=r.city;k--;continue;}}
    const offer=offers[0];if(!offer||c.funds<offer.price*2)break;
    const b=buyCard(c,offer.uid);if(b.error)break;const p=playCard(b.city,offer.uid);c=p.error?b.city:placeProjects(p.city);
  }
  return c;
}
function draftPick(strategy,c){
  const options=c.turning.pending.options,prefer=preferFor(strategy,c);
  return [...options].sort((a,b)=>(CARD_INDEX[b]?prefer(b):0)-(CARD_INDEX[a]?prefer(a):0))[0];
}
export function runStrategy(strategy,seed,until=2030,type='river'){
  let c=newCity(seed,type),n=0;
  while(c.year<until&&!c.finished&&n++<400){
    c=advance(c,Math.min(5,until-c.year));
    if(c.turning?.pending)c=selectTurningPoint(c,strategy.startsWith('focused:')||strategy==='spread'?draftPick(strategy,c):c.turning.pending.options[0]);
    if(strategy==='sensible')c=sensibleTurn(c);
    else if(strategy.startsWith('focused:')||strategy==='spread')c=doctrineTurn(strategy,c);
  }
  const s=stats(c),score=scoreOf(c);
  return {strategy,seed,year:c.year,population:s.population,prosperity:s.prosperity,score:Math.round(score.total),lost:Math.round(score.lost),declines:c.declines||0,
    doctrines:doctrineState(c).counts,undecided:c.events.filter(e=>e.undecided).length,answered:c.events.filter(e=>e.type==='history'&&!e.undecided).length,city:c};
}
