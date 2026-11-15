// v1.6 Milestone C: needs on the map, telegraphed history, score.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,advance,selectTurningPoint,stats,zoneLand,cityOrigin,normalizeCity,placeConstruction,playCard} from '../src/sim.js';
import {deckOf} from '../src/cards.js';
import {needsOf,needAnswers,NEEDS,NEED_YEARS} from '../src/needs.js';
import {omensOf} from '../src/events.js';
import {scoreOf,yearlyPoints,penalize,NEUTRAL_PROSPERITY} from '../src/score.js';
import {newCity,buildNear,runStrategy} from './helpers/strategies.js';

const step=(c,years=1)=>{c=advance(c,years);if(c.turning?.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);return c;};
function untilNeed(c,kind,limit=1500){while(c.year<limit&&!needsOf(c).some(n=>n.kind===kind&&!n.served))c=step(c);return c;}

test('needs only run in player cities, so engine runs measure the same game',()=>{
  let c=seedTown(makeCity('Engine','river',7));for(let i=0;i<8;i++)c=step(c,10);
  assert.equal(needsOf(c).length,0);assert.ok(scoreOf(c).total>0,'the score still accumulates');
});

test('a district that outgrows its market shows a need whose ring fills year by year',()=>{
  const c=untilNeed(newCity(7),'market');const n=needsOf(c).find(x=>x.kind==='market');
  assert.ok(n,'a market need appeared');assert.ok(n.progress>0&&n.progress<1);
  assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.name,'placed on the map and named');
  assert.ok(c.events.some(e=>e.type==='need'),'announced in the chronicle');
  const later=step(c,3),m=needsOf(later).find(x=>x.district===n.district&&x.kind==='market');
  assert.ok(m.progress>n.progress,'the ring fills');
  assert.ok(needAnswers('market',c.year).some(b=>b.id==='market'),'a Market Square answers it');
});

test('building the answer next to the need serves it and the ring drains away',()=>{
  let c=untilNeed(newCity(7),'market');const n=needsOf(c).find(x=>x.kind==='market');
  // v2.1: in doctrine cities the market comes from its building card.
  assert.ok(placeConstruction({...c,funds:5000},'market',n.x,n.y).error,'no treasury landmarks');
  const deck=deckOf(c);c={...c,deck:{...deck,hand:[...deck.hand,{uid:deck.nextUid,cardId:'b_market',paid:0}],nextUid:deck.nextUid+1}};
  const played=playCard(c,deck.nextUid);assert.ok(!played.error,played.error);
  const project=played.city.projects.at(-1);const built=buildNear(played.city,project.id,n.x,n.y);assert.ok(built,'a market was placed');
  let d=step(built,1);const after=needsOf(d).find(x=>x.district===n.district&&x.kind==='market');
  assert.ok(!after||after.served,'served after building');
  for(let i=0;i<12;i++)d=step(d,1);
  assert.ok(!needsOf(d).some(x=>x.district===n.district&&x.kind==='market'&&!x.served),'the need is gone');
});

test('neglect makes a district decline: homes empty, prosperity suffers, score is lost',()=>{
  let c=untilNeed(newCity(7),'market');const n=needsOf(c).find(x=>x.kind==='market');
  const before={declines:c.declines||0,lost:scoreOf(c).lost};
  let guard=0;while((c.declines||0)===before.declines&&guard++<NEED_YEARS*2)c=step(c,1);
  assert.ok((c.declines||0)>before.declines,'a decline happened');
  const ev=c.events.filter(e=>e.type==='decline').at(-1);assert.ok(ev&&ev.impact>0,'homes stood empty');
  assert.ok((c.effectsTimed||[]).some(t=>t.source.startsWith('decline:')&&t.effects.prosperity<0));
  assert.ok(scoreOf(c).lost>before.lost,'the score paid for it');
  assert.ok(scoreOf(c).penalties.some(p=>p.kind==='decline'));
  assert.ok(n.name);
});

test('the score is prosperity-years: population in thousands times prosperity over 56',()=>{
  let c=newCity(11);const s0=scoreOf(c).total;c=step(c,1);
  const s=stats(c),gained=scoreOf(c).total-s0;
  assert.ok(Math.abs(scoreOf(c).last-yearlyPoints(s))<yearlyPoints(s)*.25+.5,'about one year of points');
  assert.ok(gained>0);assert.equal(yearlyPoints({population:56000,prosperity:NEUTRAL_PROSPERITY}),56);
  c=step(c,20);const hit={...c};const lost=penalize(hit,'test',4,1,'Test',c.year);
  assert.ok(lost>0&&Math.abs(scoreOf(hit).total-(scoreOf(c).total-lost))<1e-6);
});

test('zoned workshop land develops in the first decades (it used to wait a century)',()=>{
  let c=newCity(7);const o=cityOrigin(c);const z=zoneLand(c,o.x+6,o.y+4,6,6,'craft');assert.ok(!z.error);c=z.city;
  while(c.year<1345)c=step(c,5);
  assert.ok(c.buildings.some(b=>b.type==='craft'),'a workshop stands by 1345');
});

test('needs, history ahead and score survive save and load',()=>{
  let c=newCity(7);while(c.year<1400&&!(needsOf(c).length&&omensOf(c).length))c=step(c);
  const back=normalizeCity(JSON.parse(JSON.stringify(c)));
  assert.deepEqual(needsOf(back),needsOf(c));assert.deepEqual(omensOf(back).map(o=>o.id),omensOf(c).map(o=>o.id));
  assert.equal(back.needsOn,true);assert.equal(scoreOf(back).total,scoreOf(c).total);
  const old=normalizeCity({...JSON.parse(JSON.stringify(c)),needs:undefined,score:undefined,omens:undefined,needsOn:undefined});
  assert.equal(needsOf(old).length,0);assert.equal(scoreOf(old).total,0);
});

test('exit test: a player who answers needs and history scores more than twice a passive one',()=>{
  const passive=runStrategy('passive',7,1650),sensible=runStrategy('sensible',7,1650);
  assert.ok(passive.score<sensible.score*.5,`passive ${passive.score} vs sensible ${sensible.score}`);
  assert.ok(passive.declines>sensible.declines,'neglect causes more declines');
  assert.ok(passive.undecided>0&&sensible.undecided===0);
  assert.ok(passive.population>0,'the passive city survives');
});
