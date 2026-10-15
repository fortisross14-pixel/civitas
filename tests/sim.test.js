import test from 'node:test';
import assert from 'node:assert/strict';
import {W,H,END_YEAR,makeCity,seedTown,advance as advanceCore,selectTurningPoint,stats,addZone,terrain,zoneCell,density,normalizeCity,eraAt,styleAt,STYLE_NAMES,snapshotCity,setProtection} from '../src/sim.js';

// Legacy regression scenarios automatically choose the first offered card so the
// underlying city simulation can be compared over identical chronological spans.
function advance(city,years){let c=city,target=Math.min(END_YEAR,c.year+years),guard=0;
  while(c.year<target&&guard++<300){const before=c.year;c=advanceCore(c,target-c.year);
    if(c.turning?.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);
    if(c.year===before)throw new Error(`No simulation progress at year ${before}`);
  }return c;
}
const newTown=(type='plain',seed=42)=>seedTown(makeCity('Valdoria',type,seed));

test('start has a plausible settlement, zoning, streets, and a history snapshot',()=>{
  const city=newTown('plain');const s=stats(city);
  assert.equal(city.year,1300);assert.equal(city.history[0].year,1300);
  assert.ok(city.buildings.length>=12);assert.ok(city.roads.length>0);
  assert.equal(s.population,120);assert.ok(s.capacity>=s.population);
});

test('zone edits are immutable and only on land',()=>{
  const city=makeCity('Test','plain',1);
  const edited=addZone(city,2,2,8,8,'res');
  assert.equal(city.zones.length,0);assert.equal(edited.zones.length,1);
  assert.equal(zoneCell(edited,4,4),'res');
  assert.equal(terrain('plain',3,3),'land');
  const coast=makeCity('Coastal','coast',13);
  const water=addZone(coast,95,20,3,3,'trade');
  assert.equal(water,coast,'water-only designation should have no effect');
  assert.equal(zoneCell(addZone(coast,66,15,32,30,'trade'),98,20),null);
});

test('latest zoning takes precedence; existing structures survive rezoning',()=>{
  let c=newTown();const original=c.buildings.length;
  c=addZone(c,35,34,6,6,'craft');
  assert.equal(zoneCell(c,38,36),'craft');
  assert.equal(c.buildings.length,original);
});

test('street tiles never occupy water or building parcels at creation',()=>{
  const c=newTown('river');
  const tileKey=(x,y)=>`${x},${y}`;
  const buildingTiles=new Set(c.buildings.map(b=>tileKey(Math.floor(b.x),Math.floor(b.y))));
  const streets=c.roads.filter(r=>Number.isFinite(r.x));
  for(const road of streets){assert.equal(terrain(c.type,road.x,road.y),'land');assert.ok(!buildingTiles.has(tileKey(road.x,road.y)));}
  assert.equal(new Set(streets.map(r=>tileKey(r.x,r.y))).size,streets.length);
});

test('new buildings never overlap each other or modern street tiles',()=>{
  let c=newTown('plain',874);
  c=addZone(c,10,8,42,48,'res');c=addZone(c,55,8,21,40,'craft');
  c=advance(c,730);
  const used=new Set();const roadKeys=new Set(c.roads.filter(r=>Number.isFinite(r.x)).map(r=>`${r.x},${r.y}`));
  for(const b of c.buildings){const cell=`${Math.floor(b.x)},${Math.floor(b.y)}`;
    assert.ok(!used.has(cell),`building overlap at ${cell}`);used.add(cell);
    assert.ok(!roadKeys.has(cell),`street overlaps a building at ${cell}`);
    assert.equal(terrain(c.type,Math.floor(b.x),Math.floor(b.y)),'land');
  }
});

test('growth is deterministic across different step button sequences',()=>{
  let a=newTown('river',192),b=newTown('river',192);
  a=advance(a,125);
  for(let i=0;i<25;i++)b=advance(b,5);
  assert.deepEqual(a.buildings,b.buildings);
  assert.deepEqual(a.history,b.history);
  assert.deepEqual(a.events,b.events);
  assert.equal(a.year,b.year);
  assert.equal(a.funds,b.funds);
});

test('completion stops at 2030, remains immutable, and closes chronicle once',()=>{
  let c=newTown();c=advance(c,730);assert.equal(c.year,END_YEAR);assert.equal(c.finished,true);
  assert.equal(c.history.at(-1).year,END_YEAR);
  assert.equal(c.events.filter(e=>e.year===END_YEAR).length,1);
  assert.equal(advance(c,100),c);
});

test('larger balanced zoning grows a bigger city than the base settlement',()=>{
  let base=newTown('plain',410),bigger=newTown('plain',410);
  bigger=addZone(bigger,12,8,35,50,'res');bigger=addZone(bigger,10,60,70,8,'craft');bigger=addZone(bigger,16,5,42,7,'trade');
  base=advance(base,730);bigger=advance(bigger,730);
  const a=stats(base),b=stats(bigger);
  assert.ok(b.population>a.population*2,`actual populations: ${a.population} vs ${b.population}`);
  assert.ok(b.gdp>a.gdp);assert.ok(b.buildings>a.buildings);
  assert.ok(b.gdpPerCapita>0&&a.gdpPerCapita>0);
});

test('severe housing shortage can yield crowding when jobs are available',()=>{
  let c=newTown('plain',410);
  c=addZone(c,56,5,26,55,'craft');c=advance(c,730);
  const s=stats(c);assert.ok(Math.max(...c.history.map(h=>h.housingPressure||0))>105,`peak housing pressure ${Math.max(...c.history.map(h=>h.housingPressure||0))}`);
  assert.ok(s.capacity>s.population*.8,'dense vertical redevelopment may alleviate the shortage by 2030');
});

test('metrics are bounded and internally consistent throughout history',()=>{
  let c=newTown('coast',99);c=addZone(c,10,12,30,40,'res');c=addZone(c,25,53,30,10,'craft');
  for(let i=0;i<15;i++){c=advance(c,50);let s=stats(c);
    assert.ok(s.population>=40);assert.ok(s.capacity>=120);
    assert.ok(s.unemployment>=0&&s.unemployment<=100);
    assert.ok(s.prosperity>=5&&s.prosperity<=98);
    assert.equal(s.gdpPerCapita,Math.round(s.gdp/s.population));
    assert.equal(s.overcrowding,Math.round(Math.max(0,s.population-s.capacity)/s.capacity*100));
    assert.ok(Number.isFinite(s.gdp)&&Number.isFinite(s.treasury));
  }
});

test('old v0.2 saves can be normalized and continue evolving',()=>{
  const old={id:'old123',name:'Legacy',type:'plain',seed:12,year:1340,zones:[{x:20,y:20,w:12,h:12,type:'res'}],buildings:[{id:'b0',x:21,y:21,w:1.3,h:1.5,type:'res',capacity:12,born:1300}],roads:[{key:'h10',orientation:'h',v:22,from:20,to:32,born:1300}],residents:118,funds:200,history:[],events:[],turns:8};
  const restored=normalizeCity(old);assert.ok(restored);assert.equal(restored.id,'old123');
  const evolved=advance(restored,25);assert.equal(evolved.year,1365);
  assert.equal(evolved.buildings[0].id,'b0');assert.equal(evolved.roads[0].orientation,'h');
});

test('zoning and terrain are bounded; invalid edits do not corrupt city',()=>{
  const c=makeCity('Test','plain',1);
  assert.equal(addZone(c,1,1,10,10,'bad'),c);
  assert.equal(addZone(c,0,0,0,10,'res'),c);
  let z=addZone(c,W-2,H-2,100,100,'res');
  assert.equal(z.zones[0].w,2);assert.equal(z.zones[0].h,2);
  assert.equal(zoneCell(z,W,40),null);
  assert.equal(terrain('river',W,3),'outside');
});

test('era boundaries are correctly classified',()=>{
  assert.equal(eraAt(1300).n,'Medieval');assert.equal(eraAt(1800).n,'Enlightenment');
  assert.equal(eraAt(2000).n,'Contemporary');
});

test('sector mix influences GDP per capita at the same population and employment',()=>{
  const c=makeCity('Sector','plain',10);c.year=2000;c.residents=1200;
  const jobs=660;
  const farm={...c,buildings:[{type:'farm',x:2,y:2,w:.7,h:.7,jobs}]};
  const trade={...c,buildings:[{type:'trade',x:2,y:2,w:.7,h:.7,jobs}]};
  const a=stats(farm),b=stats(trade);
  assert.equal(a.population,b.population);assert.equal(a.employment,b.employment);
  assert.ok(b.gdpPerCapita>a.gdpPerCapita*1.3,`farm ${a.gdpPerCapita}, trade ${b.gdpPerCapita}`);
});


test('building styles correspond to their construction eras and remain persistent',()=>{
  let c=newTown('plain',124);
  const first=c.buildings[0];assert.equal(first.style,'timber');
  c=addZone(c,5,7,55,45,'res');c=advance(c,730);
  assert.ok(new Set(c.buildings.map(b=>b.style)).size>=5,'centuries should produce differing styles');
  for(const b of c.buildings)assert.equal(b.style,styleAt(b.born));
  assert.equal(c.schema,8);assert.ok(Object.keys(STYLE_NAMES).length>=6);
});

test('preservation protects the original building across centuries and survives save migration',()=>{
  const town=newTown('river',191);
  const original=town.buildings[0];
  let protectedTown=setProtection(town,original.id,true);
  assert.equal(town.buildings[0].protected,false);
  assert.ok(protectedTown.buildings.find(b=>b.id===original.id).protected);
  protectedTown=advance(protectedTown,730);
  const survivor=protectedTown.buildings.find(b=>b.id===original.id);
  assert.ok(survivor,'protected building survived');assert.equal(survivor.born,1300);
  assert.equal(survivor.style,'timber');
  assert.ok(!protectedTown.sites.some(b=>b.id===original.id),'protected site was never demolished');
  const restored=normalizeCity(JSON.parse(JSON.stringify(protectedTown)));
  assert.ok(restored.buildings.find(b=>b.id===original.id).protected);
  assert.equal(setProtection(restored,original.id,false),restored,'completed cities are read-only');
});

test('50-year historical surveys contain immutable map snapshots and can be decoded',()=>{
  let c=newTown('plain',15);
  const initial=c.snapshots[0];assert.equal(initial.year,1300);
  c=advance(c,730);
  const dates=c.snapshots.map(x=>x.year);
  assert.deepEqual(dates,[1300,1350,1400,1450,1500,1550,1600,1650,1700,1750,1800,1850,1900,1950,2000,2030]);
  const map=snapshotCity(c,c.snapshots.find(x=>x.year===1750));
  assert.equal(map.year,1750);
  assert.deepEqual(map.buildings.map(b=>b.id),c.snapshots.find(x=>x.year===1750).buildings.map(a=>a[0]));
  assert.ok(map.buildings.length<c.buildings.length);
  assert.equal(c.snapshots[0].buildings.length,initial.buildings.length,'initial map must not be overwritten');
  assert.equal(map.roads.filter(r=>Number.isFinite(r.x)).length,c.snapshots.find(x=>x.year===1750).roads.length);
});

test('redevelopment preserves site records, unique IDs, and distinct architectural generations',()=>{
  let c=newTown('coast',77);c=addZone(c,12,10,45,43,'res');c=advance(c,730);
  assert.ok(c.sites.length>10);
  const ids=c.buildings.map(b=>b.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const site of c.sites){
    assert.ok(site.ended>site.born);assert.ok(site.reason);
    assert.ok(!ids.includes(site.id));
  }
  assert.ok(c.buildings.every(b=>b.born<=c.year));
});

test('local historical crises and booms produce reproducible consequences',()=>{
  let a=newTown('river',410),b=newTown('river',410);
  a=advance(a,730);for(let i=0;i<146;i++)b=advance(b,5);
  assert.deepEqual(a.sites,b.sites);
  assert.deepEqual(a.snapshots,b.snapshots);
  assert.deepEqual(a.events,b.events);
  const crises=a.events.filter(e=>['fire','flood','epidemic','boom'].includes(e.type));
  assert.ok(crises.length>=2,'there should be at least two local events in this reference seed');
  assert.ok(crises.some(e=>e.impact>0||e.type==='boom'));
});

test('a previous v0.2.1 city without survey maps begins a faithful archive at migration',()=>{
  const current=newTown('plain',192);
  const old=advance(current,220);
  const imported=normalizeCity({...old,schema:2,snapshots:undefined,sites:undefined,nextBuildingId:undefined});
  assert.equal(imported.schema,8);
  assert.equal(imported.snapshots.length,1);
  assert.equal(imported.snapshots[0].year,1520);
  const continued=advance(imported,80);
  assert.ok(continued.snapshots.some(s=>s.year===1600));
  assert.ok(continued.buildings.every(b=>b.style));
});
