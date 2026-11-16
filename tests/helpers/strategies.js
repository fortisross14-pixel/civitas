// v1.6 scripted players for the Milestone C exit test (and balance work).
// passive: founds the town and never touches it again. History goes undecided.
// sensible: every five years builds the cheapest building that answers each
//   need at the need's spot, answers history with the first response, and buys
//   and plays the cheapest card it can comfortably afford.
import {makeCity,seedTown,advance,selectTurningPoint,stats,placeConstruction,playCard,cityOrigin,demandOf,zoneLand,terrain,zoneCell,W,H} from '../../src/sim.js';
import {needsOf,needAnswers} from '../../src/needs.js';
import {omensOf,answerOmen,eventDefinition,eventScale} from '../../src/events.js';
import {buyCard,deckOf,rerollShop,rerollPrice} from '../../src/cards.js';
import {scoreOf} from '../../src/score.js';
import {cardDoctrines,DOCTRINE_IDS,doctrineState,doctrinesOn} from '../../src/doctrines.js';
import {CARD_INDEX} from '../../src/turningPoints.js';
import {foundRun} from '../../src/runs.js';
import {signCharter} from '../../src/charters.js';

// opts.legacy: found through the v2.0 run setup (that profile's card pool,
// founder, artifacts, boosters). opts.hardship alone: the full card pool at that Hardship.
export function newCity(seed,type='river',opts={}){
  const c=seedTown(makeCity('Strategy '+seed,type,seed));
  if(opts.legacy||opts.hardship){
    const legacy=opts.legacy||{hardship:10},out=foundRun(c,legacy,{...(opts.setup||{}),hardship:opts.hardship||opts.setup?.hardship||0});
    if(!opts.legacy)delete out.city.turning.cardPool;
    return opts.withLegacy?{city:out.city,legacy:out.legacy}:out.city;
  }
  return {...c,eventsOn:true,needsOn:true,turning:{...c.turning,mode:'era'}};}

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
// v2.1 doctrine cities: landmarks come from building cards. Play one from the
// hand if it answers the need, otherwise buy it from the Market Hall.
function answerWithCard(c,n){
  const ids=new Set(needAnswers(n.kind,c.year).map(b=>`b_${b.kind}`));
  let held=deckOf(c).hand.find(h=>ids.has(h.cardId));
  if(!held){const offer=(deckOf(c).shop?.offers||[]).find(o=>ids.has(o.cardId));if(!offer||offer.price>c.funds)return c;
    const b=buyCard(c,offer.uid);if(b.error)return c;c=b.city;held=deckOf(c).hand.find(h=>h.uid===offer.uid);}
  const p=playCard(c,held.uid);if(p.error)return c;
  const project=(p.city.projects||[]).at(-1);if(!project)return p.city;
  return buildNear(p.city,project.id,n.x,n.y,10)||p.city;
}
function tendCity(c){
  c=placeProjects(c);
  for(const n of needsOf(c)){if(n.served)continue;
    if(doctrinesOn(c)){c=answerWithCard(c,n);continue;}
    const options=needAnswers(n.kind,c.year).filter(b=>b.cost<=c.funds).sort((a,b)=>a.cost-b.cost);
    for(const b of options){const built=buildNear(c,b.id,n.x,n.y);if(built){c=built;break;}}
  }
  // Era Trials: take the doctrine's own answer when the city has one (it is free), as a player would.
  // A bill that would take more than half the treasury is declined (the harsher answer instead).
  for(const o of omensOf(c))if(o.choice==null){let i=0;
    if(o.id.startsWith('trial:')){const bill=Math.round(-(eventDefinition(o.id).choices[0].funds||0)*eventScale(c)*4);i=o.options.length>2?2:bill>c.funds/2?1:0;}
    const r=answerOmen(c,o.id,i);if(!r.error)c=r.city;}
  return c;
}
function sensibleTurn(c){
  c=tendCity(c);
  for(const h of [...deckOf(c).hand]){const p=playCard(c,h.uid);if(!p.error)c=placeProjects(p.city);}
  const offer=[...(deckOf(c).shop?.offers||[])].filter(o=>placeable(o.cardId)).sort((a,b)=>a.price-b.price)[0];
  if(offer&&c.funds>=offer.price*3){const b=buyCard(c,offer.uid);if(!b.error){const p=playCard(b.city,offer.uid);c=p.error?b.city:p.city;}}
  return c;
}

// v1.8 doctrine players. focused:<doctrine> buys and drafts only that doctrine;
// spread buys whichever doctrine it holds least of. Same budget rule for both.
const tags=id=>cardDoctrines(CARD_INDEX[id]);
// Scripted players cannot choose a spot on the map, so they leave urban works (street plans) alone.
const placeable=id=>!CARD_INDEX[id]?.urban;
function preferFor(strategy,c){
  // v2.0 opportunist: follows the cards it is dealt, preferring whatever doctrine it already holds most of.
  if(strategy==='opportunist'){const counts=doctrineState(c).counts;return id=>{const t=tags(id);return 1+(t.length?Math.max(...t.map(d=>counts[d]||0)):0);};}
  if(strategy.startsWith('focused:')){const d=strategy.slice(8);return id=>tags(id).includes(d)?2:0;}
  if(strategy==='spread'){const counts=doctrineState(c).counts;return id=>{const t=tags(id);if(!t.length)return 0;return 2-Math.min(...t.map(d=>counts[d]||0))/4;};}
  return ()=>1;
}
function doctrineTurn(strategy,c){
  c=tendCity(c);const prefer=preferFor(strategy,c);
  // Play what the founding put in the hand (founder cards, boosters).
  for(const h of [...deckOf(c).hand]){const p=playCard(c,h.uid);if(!p.error)c=placeProjects(p.city);}
  let rerolled=false;
  for(let k=0;k<2;k++){
    let offers=[...(deckOf(c).shop?.offers||[])].filter(o=>placeable(o.cardId)&&prefer(o.cardId)>0).sort((a,b)=>prefer(b.cardId)-prefer(a.cardId)||a.price-b.price);
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
// v3.4: building happens only on zoned land. Every scripted player but the passive one
// zones a block near town for each use the city is short of (as a player reads the demand).
export function autoZone(c){
  const d=demandOf(c),o=cityOrigin(c),size={res:[10,8],trade:[6,5],craft:[7,6],farm:[9,8],civic:[4,4]};let i=0;
  for(const t of ['res','trade','craft','farm','civic']){if(!d[t].short)continue;const [w,h]=size[t];let best=null;
    for(let R=3;R<60&&!best;R+=2)for(let k=0;k<16&&!best;k++){const a=k/16*Math.PI*2+(c.year+i*7)%7,x=Math.round(o.x+Math.cos(a)*R-w/2),y=Math.round(o.y+Math.sin(a)*R-h/2);
      if(x<2||y<2||x+w>=W-2||y+h>=H-2)continue;let free=0;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(terrain(c.type,xx,yy)==='land'&&zoneCell(c,xx,yy)==null)free++;
      if(free>=w*h*.75)best=[x,y];}
    i++;if(best){const r=zoneLand(c,best[0],best[1],w,h,t);if(!r.error)c=r.city;}}
  return c;
}
// One decision round for a scripted player (draft pick, then its turn).
export function takeTurn(strategy,c){
  if(strategy!=='passive')c=autoZone(c);
  // v3: a new Age offers charters; scripted players sign the first (the steady one).
  if(c.charterOffer)c={...signCharter(c,0).city,ageWelcome:null};
  const doctrinal=strategy.startsWith('focused:')||strategy==='spread'||strategy==='opportunist';
  if(c.turning?.pending)c=selectTurningPoint(c,doctrinal?draftPick(strategy,c):c.turning.pending.options[0]);
  if(strategy==='sensible')c=sensibleTurn(c);
  else if(doctrinal)c=doctrineTurn(strategy,c);
  return c;
}
export function runStrategy(strategy,seed,until=2030,type='river',opts={}){
  let c=opts.city||newCity(seed,type,opts),n=0;
  while(c.year<until&&!c.finished&&n++<400){
    c=advance(c,Math.min(5,until-c.year));
    c=takeTurn(strategy,c);
  }
  const s=stats(c),score=scoreOf(c);
  return {strategy,seed,year:c.year,population:s.population,prosperity:s.prosperity,score:Math.round(score.total),lost:Math.round(score.lost),declines:c.declines||0,
    doctrines:doctrineState(c).counts,undecided:c.events.filter(e=>e.undecided).length,answered:c.events.filter(e=>e.type==='history'&&!e.undecided).length,city:c};
}
