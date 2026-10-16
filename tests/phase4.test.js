import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,addZone,advance,advanceMonths,selectTurningPoint,resolveEvent,cityEffects,normalizeCity,buildWall,wallPolygon,insideWall,stats} from '../src/sim.js';
import {EVENTS,eventDefinition,timedEffects} from '../src/events.js';
import {timelapseFrames,timelapseView} from '../src/timelapse.js';
import {streetChains} from '../src/render.js';

// v1.4 (Phase 4) historical events, organic walls, map drawing and the timelapse.
const town=(type='river',seed=42,events=true)=>{const c=seedTown(makeCity('Annals',type,seed));c.eventsOn=events;return c;};
function play(c,until,pick=0,log=[]){let n=0;while(c.year<until&&!c.finished&&n++<200){c=advance(c,until-c.year);if(c.turning?.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);if(c.event){log.push(c.event);c=resolveEvent(c,pick);}}return c;}

test('historical events arrive about once a generation, each in its own era and only once',()=>{
  const log=[];const c=play(addZone(town('river',777),30,20,30,25,'res'),2030,0,log);
  const history=log.filter(e=>!e.id.startsWith('disaster:'));
  assert.ok(history.length>=10&&history.length<=EVENTS.length,`${history.length} events`);
  assert.equal(new Set(history.map(e=>e.id)).size,history.length,'no event repeats');
  for(const e of history){const def=eventDefinition(e.id);assert.ok(e.year>=def.from&&e.year<=def.to,`${e.id} in ${e.year}`);}
  for(let i=1;i<history.length;i++)assert.ok(history[i].year-history[i-1].year>=12,'events are spaced out');
  assert.ok(c.events.filter(e=>e.type==='history').every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&e.choice),'each answer is placed on the map');
});
test('events are opt-in, so engine runs without a player never stop for them',()=>{
  const c=play(addZone(town('river',777,false),30,20,30,25,'res'),1700);
  assert.ok(!c.event&&!(c.seenEvents||[]).length);
});
test('a pending event pauses the clock until answered; answers apply now and for years',()=>{
  let c=addZone(town('river',777),30,20,30,25,'res');
  while(!c.event&&c.year<1500){c=advance(c,200);if(c.turning?.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);}
  assert.ok(c.event,'an event opened');
  assert.equal(advance(c,10),c);assert.equal(advanceMonths(c,6),c);
  const def=eventDefinition(c.event.id),i=def.choices.findIndex(v=>v.effects&&v.years);
  const answered=resolveEvent(c,Math.max(0,i));
  assert.equal(answered.event,null);assert.ok(answered.seenEvents.includes(c.event.id));
  if(i>=0){const [k,v]=Object.entries(def.choices[i].effects)[0];
    assert.ok(Math.abs((cityEffects(answered)[k]||0)-(cityEffects(c)[k]||0)-v)<1e-9,`${k} applied`);
    assert.equal(timedEffects({...answered,year:c.year+def.choices[i].years})[k],undefined,'effects expire');}
  // Saved and reloaded mid-event, the question is still there.
  const saved=normalizeCity(JSON.parse(JSON.stringify(c)));
  assert.equal(saved.event.id,c.event.id);assert.equal(saved.eventsOn,true);
  const reloaded=normalizeCity(JSON.parse(JSON.stringify(answered)));
  assert.deepEqual(reloaded.effectsTimed,answered.effectsTimed);
});
test('city walls follow the shape of the town instead of a circle',()=>{
  let c=play(addZone(addZone(town('river',21,false),14,14,26,8,'res'),20,30,8,18,'res'),1450);
  c={...c,funds:1e6};const built=buildWall(c);assert.equal(built.error,null);
  const w=built.city.walls[0],poly=wallPolygon(w);
  const radii=poly.map(([x,y])=>Math.hypot(x-w.cx,y-w.cy));
  assert.ok(Math.max(...radii)/Math.min(...radii)>1.3,'radius varies around the town');
  const homes=c.buildings.filter(b=>b.type==='res'),inside=homes.filter(b=>insideWall(w,b.x+.4,b.y+.4)).length;
  assert.ok(inside/homes.length>.7,`${inside}/${homes.length} homes inside`);
});
test('streets are drawn as smooth curves, medieval lanes most of all',()=>{
  const c=play(town('river',33,false),1500);
  const {chains}=streetChains(c);assert.ok(chains.length>5);
  const bends=chains.filter(ch=>ch.pattern==='organic'&&ch.pts.length>8).map(ch=>{let turn=0;for(let i=2;i<ch.pts.length;i++){const a=Math.atan2(ch.pts[i-1][1]-ch.pts[i-2][1],ch.pts[i-1][0]-ch.pts[i-2][0]),b=Math.atan2(ch.pts[i][1]-ch.pts[i-1][1],ch.pts[i][0]-ch.pts[i-1][0]);turn+=Math.abs(Math.atan2(Math.sin(b-a),Math.cos(b-a)));}return turn/(ch.pts.length-2);});
  assert.ok(bends.length>0);
  assert.ok(bends.every(v=>v<.6),'no sharp corners');
});
test('the timelapse shows one map every fifty years plus the present, with captions',()=>{
  const c=play(addZone(town('river',777),30,20,30,25,'res'),1720);
  const frames=timelapseFrames(c);
  assert.deepEqual(frames.map(f=>f.year),[1300,1350,1400,1450,1500,1550,1600,1650,1700,1720]);
  assert.ok(frames.at(-1).present);
  assert.ok(frames.every((f,i)=>i===0||f.population>=0&&f.city.buildings.length>=frames[0].city.buildings.length));
  const captioned=frames.filter(f=>f.caption);assert.ok(captioned.length>=4,`${captioned.length} captions`);
  assert.ok(captioned.every(f=>/^\d{4}: /.test(f.caption.text)&&Number.isFinite(f.caption.x)));
  const v=timelapseView(frames,800,600);assert.ok(v.zoom>=1,'zoomed on the town');
  assert.equal(stats(frames.at(-1).city).population,stats(c).population);
});
