import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,addZone,advance,selectTurningPoint,stats,placeConstruction,cityEffects,cityFields,districtDetails,cityOrigin,setPolicy,revertEdit,policyIssue,W,H} from '../src/sim.js';
import {generateOffers,CARD_INDEX} from '../src/turningPoints.js';
import {campaign} from './helpers/balance-fixture.js';

// v1.3 (Phase 3) location, districts, character and policies.
const town=(type='plain',seed=42)=>seedTown(makeCity('Quarters',type,seed));
function run(c,years){let n=0;const t=Math.min(2030,c.year+years);while(c.year<t&&n++<80){c=advance(c,t-c.year);if(c.turning?.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);}return c;}
const home=c=>c.buildings.find(b=>b.type==='res'&&!b.vacant);
function freeCellNear(c,b,maxR=3){const used=new Set([...c.buildings.map(v=>`${Math.floor(v.x)},${Math.floor(v.y)}`),...c.roads.filter(r=>Number.isFinite(r.x)).map(r=>`${r.x},${r.y}`)]);
  for(let r=1;r<=maxR;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=Math.floor(b.x)+dx,y=Math.floor(b.y)+dy;if(x>1&&y>1&&x<W-2&&y<H-2&&!used.has(`${x},${y}`))return {x,y};}return null;}

test('workshops beside homes put them in smoke and cost prosperity; garden-city planning softens it',()=>{
  let c={...run(town('plain',5),500)};
  const before=stats(c);
  // Plant a cluster of factories in the middle of the residential core.
  const homes=c.buildings.filter(b=>b.type==='res').slice(0,12);
  const factories=homes.map((b,i)=>({...b,id:`f${i}`,type:'craft',capacity:0,jobs:600}));
  const smoky={...c,buildings:c.buildings.map(b=>homes.includes(b)?factories[homes.indexOf(b)]:b)};
  const after=stats(smoky);
  assert.ok(after.pollutedHomes>before.pollutedHomes,`polluted homes ${before.pollutedHomes}% → ${after.pollutedHomes}%`);
  assert.ok(after.placeProsperity<before.placeProsperity);
  const garden={...smoky,year:1950,policies:{garden_city:1950}};
  assert.ok(stats(garden).pollutedHomes<=stats({...smoky,year:1950}).pollutedHomes);
});
test('a parish church brings services to the homes around it',()=>{
  let c=town('plain',8);c={...c,funds:5000};
  const far=c.buildings.filter(b=>b.type==='res').sort((a,b)=>cityFields(c).service[Math.floor(a.y)*W+Math.floor(a.x)]-cityFields(c).service[Math.floor(b.y)*W+Math.floor(b.x)])[0];
  const spot=freeCellNear(c,far);assert.ok(spot);
  const built=placeConstruction(c,'chapel',spot.x,spot.y);assert.equal(built.error,null);
  assert.ok(stats(built.city).serviceCoverage>=stats(c).serviceCoverage);
  assert.ok(cityFields(built.city).service[Math.floor(far.y)*W+Math.floor(far.x)]>=.35,'the nearby home is now served');
});
test('new homes avoid industrial smoke',()=>{
  let c=addZone(addZone(town('plain',11),20,14,30,24,'res'),30,40,16,10,'craft');
  c=run(c,500);const s=stats(c);
  assert.ok(s.industry>10);
  assert.ok(s.pollutedHomes<25,`${s.pollutedHomes}% of homes in smoke`);
});
test('districts form between main roads and keep their names',()=>{
  let c=run(town('river',21),250);
  assert.ok(c.districts.length>=2,`${c.districts.length} districts`);
  assert.ok(c.districts.some(d=>/Old (Town|Centre)/.test(d.name)),'the founding quarter is the Old Town');
  const names=new Set(c.districts.map(d=>d.name));assert.equal(names.size,c.districts.length,'names are unique');
  const later=run(c,100),kept=c.districts.filter(d=>later.districts.some(v=>v.id===d.id));
  assert.ok(kept.length>=c.districts.length-1,'districts persist');
  for(const d of kept)assert.equal(later.districts.find(v=>v.id===d.id).name,d.name,'names never change');
  const details=districtDetails(later,cityOrigin(later));
  assert.ok(details.list.every(d=>d.count>=10&&d.centroid&&d.dominant));
});
test('the city character follows what it builds and steers its Turning Points',()=>{
  const industrial=campaign(410,'compact','industry',false),cultural=campaign(410,'compact','culture',false);
  assert.equal(industrial.city.character.lead,'industry');
  assert.ok(cultural.city.character.shares.culture>industrial.city.character.shares.culture);
  // Same town, same Turning Point: an industrial character draws more industry cards.
  const base=run(town('plain',30),200);
  const count=(character)=>{let n=0;for(let i=0;i<40;i++)for(const id of generateOffers({...base,character},i%20,i))if(CARD_INDEX[id]?.domain==='industry')n++;return n;};
  const lean=count({shares:{industry:.6,trade:.1,culture:.1,faith:.1,learning:.1}}),other=count({shares:{industry:0,trade:.6,culture:.2,faith:.1,learning:.1}});
  assert.ok(lean>other,`industry offers ${lean} vs ${other}`);
});
test('policies are bound to their era and geography, apply their effects and can be undone',()=>{
  const c=town('plain',3);
  assert.match(policyIssue(c,'tolerance'),/1500/);
  assert.match(policyIssue({...c,year:1600},'free_port'),/harbour/);
  const later={...c,year:1600};
  const adopted=setPolicy(later,'tolerance',true);assert.equal(adopted.error,null);
  assert.ok((cityEffects(adopted.city).migration||0)>=(cityEffects(later).migration||0)+.15-1e-9);
  assert.ok((cityEffects(adopted.city).faith||0)<(cityEffects(later).faith||0));
  assert.deepEqual(revertEdit(adopted.city,adopted.undo).policies,{});
  const guilds=setPolicy(c,'guild_charters',true).city;
  assert.ok((cityEffects({...guilds,year:1850}).industry||0)<(cityEffects(guilds).industry||0),'guild charters lapse after 1799');
});
