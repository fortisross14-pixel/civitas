import test from 'node:test';
import assert from 'node:assert/strict';
import {W,H,makeCity,seedTown,addZone,clearZone,zoneCell,advance,advanceMonths,selectTurningPoint,stats,terrain,
  insideWall,setTax,demolishArea,buildWall,convertWall,buildBridge,bridgeAt,publicWorkIssue,revertEdit,placeConstruction,normalizeCity} from '../src/sim.js';
import {taxesOf,annualRevenue} from '../src/economy.js';

// v1.1 "Living City" (Phase 1) behaviour.
const town=(type='river',seed=42)=>seedTown(makeCity('Living',type,seed));
function run(c,years){let n=0;const target=Math.min(2030,c.year+years);while(c.year<target&&n++<80){c=advance(c,target-c.year);if(c.turning?.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);}return c;}

test('the city changes month by month, not in five-year jumps',()=>{
  let c=run(town('plain',5),250);
  const seen=new Set();
  for(let i=0;i<24;i++){c=advanceMonths(c,1);if(c.turning?.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);seen.add(`${c.buildings.length}|${Math.round(c.residents)}`);}
  assert.ok(seen.size>=8,`only ${seen.size} distinct monthly states in two years`);
});
test('the founding town sits on country roads that lead off the map',()=>{
  for(const type of ['river','plain','coast','estuary','lake']){
    const c=town(type,9);
    assert.ok(c.routes.length>=2,`${type}: ${c.routes.length} main roads`);
    for(const r of c.routes){const [x,y]=r.cells.at(-1);assert.ok(x===0||y===0||x===W-1||y===H-1,`${type}: route ends inside the map`);}
    assert.ok(c.roads.every(r=>!Number.isFinite(r.x)||terrain(type,r.x,r.y)==='land'||r.cls==='bridge'));
  }
});
test('an unzoned town keeps growing informally along its streets',()=>{
  const c=run(town('plain',11),400);
  assert.ok(c.buildings.some(b=>b.informal),'informal buildings should appear once districts fill');
  assert.ok(c.buildings.filter(b=>b.informal).every(b=>zoneCell(c,Math.floor(b.x),Math.floor(b.y))==null||b.born<1700));
});
test('streets grow toward newly zoned land and buildings follow',()=>{
  let c=run(town('plain',21),200);
  c=addZone(c,8,8,14,14,'res');
  const before=c.buildings.filter(b=>b.x>=8&&b.x<22&&b.y>=8&&b.y<22).length;
  c=run(c,60);
  const after=c.buildings.filter(b=>b.x>=8&&b.x<22&&b.y>=8&&b.y<22).length;
  assert.ok(after>before+5,`buildings in the new district: ${before} → ${after}`);
});
test('clearing zoning stops new planned growth but keeps existing buildings',()=>{
  let c=run(town('plain',3),120);
  const count=c.buildings.length;
  const cleared=clearZone(c,0,0,W,H);
  assert.equal(cleared.buildings.length,count);
  assert.equal(zoneCell(cleared,48,35),null);
  assert.equal(clearZone(cleared,0,0,W,H),cleared,'nothing left to clear');
});
test('taxes trade revenue for demand in each sector',()=>{
  const c=run(town('plain',8),250);const s=stats(c);
  const base=annualRevenue(c,s),none=annualRevenue({...c,taxes:{...taxesOf(c),res:'none'}},s),high=annualRevenue({...c,taxes:{...taxesOf(c),res:'high'}},s);
  assert.equal(none.res,0);assert.ok(high.res>base.res*1.3);
  const relaxed=setTax(c,'craft','none'),squeezed=setTax(c,'craft','high');
  let a=run(relaxed.city,120),b=run(squeezed.city,120);
  const crafts=x=>x.buildings.filter(v=>v.type==='craft').length;
  assert.ok(crafts(a)>=crafts(b),`untaxed industry ${crafts(a)} vs heavily taxed ${crafts(b)}`);
  assert.ok(stats(setTax(c,'res','none').city).prosperity>stats(setTax(c,'res','high').city).prosperity);
  assert.deepEqual(revertEdit(relaxed.city,relaxed.undo).taxes,taxesOf(c));
});
test('demolition removes unprotected buildings and can be undone',()=>{
  const c=town('plain',14),target=c.buildings[3],x=Math.floor(target.x),y=Math.floor(target.y);
  const {city:razed,undo,error}=demolishArea(c,x,y,1,1);
  assert.equal(error,null);assert.ok(!razed.buildings.some(b=>b.id===target.id));
  assert.ok(razed.sites.some(s=>s.id===target.id&&s.reason==='Demolished'));
  const back=revertEdit(razed,undo);
  assert.ok(back.buildings.some(b=>b.id===target.id));assert.ok(!back.sites.some(s=>s.id===target.id));
  const guarded={...c,buildings:c.buildings.map(b=>b.id===target.id?{...b,protected:true}:b)};
  assert.match(demolishArea(guarded,x,y,1,1).error,/Protected/);
});
test('a city wall rings the core and later becomes a canal ring',()=>{
  let c=run(town('river',31),160);c={...c,funds:50000};
  assert.equal(publicWorkIssue({...c,year:1600},'canal'),'Needs a standing city wall to replace');
  const walled=buildWall(c);assert.equal(walled.error,null);
  const wall=walled.city.walls[0];assert.equal(wall.state,'wall');
  const inside=c.buildings.filter(b=>b.type!=='farm'&&insideWall(wall,b.x+.4,b.y+.4)).length/c.buildings.filter(b=>b.type!=='farm').length;
  assert.ok(inside>=.8,`only ${Math.round(inside*100)}% of the core inside the wall`);
  assert.ok(stats(walled.city).prosperity>=stats(c).prosperity);
  let later=run(walled.city,150);later={...later,funds:50000};
  const ring=convertWall(later,'canal');assert.equal(ring.error,null);
  assert.equal(ring.city.walls[0].state,'canal');
  assert.ok(ring.city.roads.filter(r=>r.cls==='ring').length>10);
  const undone=revertEdit(ring.city,ring.undo);assert.equal(undone.walls[0].state,'wall');assert.equal(undone.roads.filter(r=>r.cls==='ring').length,0);
});
test('a bridge crosses the river and the city grows on the far bank',()=>{
  let c=run(town('river',12),200);c={...c,funds:50000};
  // Click a bank cell beside the river near the town.
  let site=null;for(let y=30;y<45&&!site;y++)for(let x=40;x<60&&!site;x++)if(terrain('river',x,y)==='land'&&terrain('river',x+1,y)==='water'&&bridgeAt(c,x,y))site={x,y};
  assert.ok(site,'a bridge site exists');
  const built=buildBridge(c,site.x,site.y);assert.equal(built.error,null);
  assert.ok(built.city.roads.some(r=>r.cls==='bridge'&&terrain('river',r.x,r.y)==='water'));
  const farBefore=c.buildings.filter(b=>b.x>60).length;
  // The player zones the far bank; streets cross the bridge to reach it.
  const grown=run(addZone(built.city,62,25,14,18,'res'),120);
  assert.ok(grown.buildings.filter(b=>b.x>60).length>farBefore,'buildings appear across the river');
  const undone=revertEdit(built.city,built.undo);assert.equal(undone.bridges.length,0);assert.ok(!undone.roads.some(r=>r.cls==='bridge'));
});
test('placing a civic building can be undone with a refund',()=>{
  const c=town('plain',15);let placed=null;
  for(let y=20;y<50&&!placed;y++)for(let x=20;x<70&&!placed;x++){const r=placeConstruction(c,'market',x,y);if(!r.error)placed=r;}
  const undone=revertEdit(placed.city,{kind:'place',buildingId:placed.placed.id,refund:130});
  assert.equal(undone.funds,c.funds);assert.equal(undone.buildings.length,c.buildings.length);
});
test('live-city fields survive saving and loading',()=>{
  let c=run(town('river',19),100);c=setTax(c,'trade','low').city;c={...c,funds:20000};c=buildWall(c).city;
  const restored=normalizeCity(JSON.parse(JSON.stringify(c)));
  assert.equal(restored.taxes.trade,'low');assert.equal(restored.walls.length,1);assert.equal(restored.routes.length,c.routes.length);
  assert.deepEqual(advanceMonths(restored,14).buildings,advanceMonths(c,14).buildings);
});
