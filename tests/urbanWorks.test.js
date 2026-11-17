// v2.3 urban works: cards that lay out part of the street plan where you tap.
import test from 'node:test';
import assert from 'node:assert/strict';
import {playCard,playUrbanCard,urbanPlan,cityOrigin,advance,selectTurningPoint} from '../src/sim.js';
import {CARD_INDEX} from '../src/turningPoints.js';
import {URBAN_CARDS} from '../src/doctrineCards.js';
import {deckOf,shopEligible} from '../src/cards.js';
import {updateDistricts} from '../src/districts.js';
import {runStrategy} from './helpers/strategies.js';

const base=(()=>{let c;return()=>c||(c=runStrategy('sensible',7,1700).city);})();
const give=(c,id)=>{const d=deckOf(c);return {city:{...c,deck:{...d,hand:[...d.hand,{uid:d.nextUid,cardId:id,paid:0}],nextUid:d.nextUid+1}},uid:d.nextUid};};
const west=c=>{const o=cityOrigin(c);return {x:o.x-18,y:o.y+4};};

test('one or two urban works for every age (kept for cards already held)',()=>{
  const ages=[[1300,1499],[1500,1699],[1700,1849],[1850,1949],[1950,2030]];
  for(const [a,b] of ages)assert.ok(URBAN_CARDS.some(c=>c.minYear<=b&&c.maxYear>=a),`${a}–${b}`);
  const c=base();
  // v4.0: no longer sold (the zone forms cover them); cards already held still play.
  assert.ok(!shopEligible(CARD_INDEX.urb_new_town,c)&&!shopEligible(CARD_INDEX.urb_boulevard,c),'urban works are not sold any more');
});
test('a work must be placed: playing it without a spot is refused',()=>{
  const {city,uid}=give(base(),'urb_new_town');
  assert.match(playCard(city,uid).error,/choose where/);
});
test('a planned extension lays a grid of straight streets, zones homes and names its quarter',()=>{
  const {city,uid}=give(base(),'urb_new_town'),p=west(city);
  const r=playUrbanCard(city,uid,p.x,p.y);assert.equal(r.error,null);
  assert.ok(!deckOf(r.city).hand.some(h=>h.uid===uid),'card used');
  const laid=r.city.roads.filter(rd=>rd.work==='planned_extension');assert.ok(laid.length>=30,`${laid.length} streets`);
  const rows=new Set(laid.map(rd=>rd.y)),cols=new Set(laid.map(rd=>rd.x));assert.ok(rows.size>=3&&cols.size>=3,'a lattice');
  assert.ok(r.city.zones.at(-1).type==='res');
  assert.equal(r.city.quarterNames.at(-1).name,'New Town');
  let c=r.city;for(let i=0;i<4;i++){c=advance(c,10);if(c.turning.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);}
  const names=updateDistricts(c,cityOrigin(c)).map(d=>d.name);
  assert.ok(names.some(n=>/New Town/.test(n)),`districts: ${names}`);
});
test('a grand boulevard cuts a straight main avenue across the town and clears what is in its way',()=>{
  const c={...base(),year:1860},o=cityOrigin(c),{city,uid}=give(c,'urb_boulevard');
  const plan=urbanPlan(city,'urb_boulevard',o.x,o.y+3);assert.equal(plan.error,undefined);
  const r=playUrbanCard(city,uid,o.x,o.y+3);assert.equal(r.error,null);
  const av=r.city.roads.filter(rd=>rd.work==='grand_boulevard');assert.ok(av.length>=5&&av.every(rd=>rd.cls==='main'));
  assert.ok(new Set(av.map(rd=>rd.y)).size===1||new Set(av.map(rd=>rd.x)).size===1,'straight');
  for(const id of plan.clear)assert.ok(!r.city.buildings.some(b=>b.id===id),'cleared');
});
test('every work plans something on open land, and refuses water',()=>{
  const c=base(),p=west(c);
  // Open land for each work: west of town, further out until the plan fits (the town grows).
  const spot=card=>{if(card.urban==='grand_boulevard')return cityOrigin(c);for(let d=0;d<30;d+=2){const q={x:p.x-d,y:p.y};if(!urbanPlan(c,card.id,q.x,q.y).error)return q;}return p;};
  for(const card of URBAN_CARDS){const q=spot(card),plan=urbanPlan(c,card.id,q.x,q.y);assert.ok(!plan.error,`${card.id}: ${plan.error}`);assert.ok(plan.streets.length>=5,card.id);}
  const o=cityOrigin(c);let wx=null;for(let x=o.x;x<100;x++){const t=urbanPlan(c,'urb_new_town',x,o.y);if(t.error==='Choose dry land'){wx=x;break;}}
  assert.ok(wx!==null,'the river is refused');
});
