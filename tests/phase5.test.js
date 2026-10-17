import test from 'node:test';
import assert from 'node:assert/strict';
import {W,H,makeCity,seedTown,advance,advanceMonths,selectTurningPoint,stats,terrain,normalizeCity,revertEdit,cityOrigin,cityEffects,cityFields,cityReach,captureSnapshot,snapshotCity,
  prepareFounding,placeTownCenter,upgradeTownCenter,townCenterIssue,townCenterLevel,TOWN_CENTER_LEVELS,renameDistrict,DISTRICT_NAME_MAX} from '../src/sim.js';
import {roofTone,USE_ROOF,drawCity,buildingPlan} from '../src/render.js';

// v1.5 (Phase 5) roofs that show land use, the player's Town Center,
// renamable districts and varied civic buildings.
const STYLES=['timber','stone','classical','brick','modernist','contemporary'];
const USES=['res','trade','craft','civic','farm'];
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const dist=(a,b)=>{const [p,q]=[rgb(a),rgb(b)];return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);};
function hue(hex){const [r,g,b]=rgb(hex).map(v=>v/255),mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(!d)return 0;
  const h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;return (h*60+360)%360;}
const hueGap=(a,b)=>{const d=Math.abs(a-b)%360;return Math.min(d,360-d);};
// A recording 2D context: drawCity runs headless and we read back what it painted.
function recorder(){const fills=new Set(),arcs=[];let style='';
  const ctx=new Proxy({},{get(_,k){
    if(k==='fillStyle')return style;
    if(k==='fill')return ()=>fills.add(style);
    if(k==='fillRect')return ()=>fills.add(style);
    if(k==='arc')return (x,y,r)=>arcs.push({x,y,r});
    if(k==='measureText')return ()=>({width:10});
    if(k==='createRadialGradient'||k==='createLinearGradient')return ()=>({addColorStop(){}});
    return ()=>{};},
    set(_,k,v){if(k==='fillStyle')style=v;return true;}});
  return {ctx,fills,arcs};}
const unfounded=(type='river',seed=42)=>prepareFounding(makeCity('Founders',type,seed));
const founded=(x=24,y=36,type='river',seed=42)=>placeTownCenter(unfounded(type,seed),x,y).city;
function grow(c,until){let n=0;while(c.year<until&&!c.finished&&n++<80){c=advance(c,until-c.year);if(c.turning?.pending)c=selectTurningPoint(c,c.turning.pending.options[0]);}return c;}

// ── #3 roof colours follow land use ──
test('in every era, homes, shops, workshops, civic halls and farms have clearly different roofs',()=>{
  for(const style of STYLES)for(let i=0;i<USES.length;i++)for(let j=i+1;j<USES.length;j++){
    const a=roofTone(USES[i],style,0),b=roofTone(USES[j],style,0);
    assert.ok(dist(a,b)>=24,`${style}: ${USES[i]} ${a} vs ${USES[j]} ${b} too close (${dist(a,b).toFixed(1)})`);
  }
});
test('the era changes the shade within a use, never the use’s colour family',()=>{
  for(const use of USES){
    const tones=STYLES.map(s=>roofTone(use,s,0));
    assert.ok(new Set(tones).size>=5,`${use}: eras should look different`);
    // Saturated families keep their hue; the greys (workshops) stay grey-blue.
    if(USE_ROOF[use].s>15)for(const t of tones)assert.ok(hueGap(hue(t),USE_ROOF[use].h)<=14,`${use} ${t} drifted to hue ${hue(t).toFixed(0)}`);
    // Each tone sits nearer its own use than any other use's tone of the same era.
    STYLES.forEach((s,i)=>{for(const other of USES)if(other!==use)assert.ok(dist(tones[i],roofTone(use,STYLES[(i+1)%6],0))<dist(tones[i],roofTone(other,s,0))+40,`${use}/${s} vs ${other}`);});
  }
});
test('roofs stay muted parchment tones, with shades and the red-tile accent for homes',()=>{
  for(const use of USES)for(const style of STYLES)for(let shade=0;shade<4;shade++){
    const [r,g,b]=rgb(roofTone(use,style,shade)),mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    // No brighter than the map's existing red tiles (#a3523d) and shop awnings (#c49a5a).
    assert.ok(mx-mn<=106&&mx<=200&&mn>=40,`${use}/${style}/${shade} is too vivid or extreme: ${roofTone(use,style,shade)}`);
  }
  assert.notEqual(roofTone('res','timber',0),roofTone('res','timber',2));
  assert.notEqual(roofTone('res','timber',0,true),roofTone('res','timber',0));
});
test('the map paints each use in its own roof colour and keeps red tiles to homes',()=>{
  const base=seedTown(makeCity('Painted','plain',7));
  const only=type=>({...base,buildings:base.buildings.map(b=>({...b,type,special:undefined,born:1300,style:'timber',level:1}))});
  for(const type of ['res','trade','craft','farm']){
    const {ctx,fills}=recorder();drawCity(ctx,only(type),800,600,{layer:'urban',cartouche:false});
    const own=[0,1,2,3].map(s=>roofTone(type,'timber',s));
    assert.ok(own.some(c=>fills.has(c)),`${type} roofs drawn in their own palette`);
    for(const other of USES.filter(u=>u!==type))for(let s=0;s<4;s++)assert.ok(!fills.has(roofTone(other,'timber',s)),`${type} map shows ${other} roofs`);
    if(type!=='res')assert.ok(!fills.has(roofTone('res','timber',0,true)),`${type}: no red tiles`);
  }
});

// ── #4 the Town Center ──
test('a new run waits for its Town Center: no time passes and nothing is built',()=>{
  const c=unfounded();
  assert.equal(c.awaitingCenter,true);assert.equal(c.buildings.length,0);
  assert.equal(advance(c,10),c);assert.equal(advanceMonths(c,3),c);
  assert.match(townCenterIssue(c,'upgrade'),/Found the town first/);
  // The wait survives a save and reload.
  assert.equal(normalizeCity(JSON.parse(JSON.stringify(c))).awaitingCenter,true);
});
test('the Town Center must go on open dry land away from the map edge',()=>{
  const c=unfounded('river',3);
  let water=null;for(let x=0;x<W&&!water;x++)if(terrain('river',x,30)==='water')water=x;
  assert.match(placeTownCenter(c,water,30).error,/dry land/);
  assert.match(placeTownCenter(c,2,30).error,/edge/);
  assert.match(placeTownCenter(c,40,H-3).error,/edge/);
  // Squeezed against the river: too little land around it.
  assert.match(placeTownCenter(c,water-1,30).error,/water/);
  assert.equal(placeTownCenter(c,water,30).city,c,'a refused placement changes nothing');
});
test('placing the Town Center founds the town around it, and the clock can then run',()=>{
  for(const [x,y] of [[20,24],[36,48]]){
    const c=founded(x,y,'plain',11);
    assert.equal(c.awaitingCenter,undefined);
    assert.deepEqual(c.center,{x,y,level:1,founded:1300});
    assert.deepEqual(cityOrigin(c),{x,y});
    assert.ok(c.buildings.length>=15,`${c.buildings.length} founding buildings`);
    const cx=c.buildings.reduce((n,b)=>n+b.x,0)/c.buildings.length,cy=c.buildings.reduce((n,b)=>n+b.y,0)/c.buildings.length;
    assert.ok(Math.hypot(cx-x,cy-y)<9,`town centred ${cx.toFixed(1)},${cy.toFixed(1)} vs ${x},${y}`);
    assert.ok(c.routes.length>=2,'country roads lead out from the center');
    assert.ok(c.routes.every(r=>r.cells.some(([rx,ry])=>Math.hypot(rx-x,ry-y)<=1.5)),'every main road starts at the center');
    assert.match(c.events.at(-1).text,/founded around its Market Cross/);
    assert.equal(c.events.at(-1).type,'works');
    const later=advanceMonths(c,6);assert.notEqual(later,c);assert.equal(later.month,6);
  }
});
test('once placed, the Town Center cannot be moved, and it survives save and reload',()=>{
  const c=founded();
  assert.match(placeTownCenter(c,30,30).error,/cannot be moved/);
  const saved=normalizeCity(JSON.parse(JSON.stringify(c)));
  assert.deepEqual(saved.center,c.center);assert.equal(saved.awaitingCenter,false);
  assert.equal(normalizeCity({...JSON.parse(JSON.stringify(c)),center:{x:'a',y:3}}).center,null,'malformed centers are dropped');
});
test('the city keeps growing around its Town Center, wherever it was founded',()=>{
  for(const [x,y] of [[20,22],[34,50]]){
    const c=grow(founded(x,y,'plain',5),1450);
    const town=c.buildings.filter(b=>b.type!=='farm'),cx=town.reduce((n,b)=>n+b.x,0)/town.length,cy=town.reduce((n,b)=>n+b.y,0)/town.length;
    assert.ok(town.length>40,`${town.length} buildings by 1450`);
    assert.ok(Math.hypot(cx-x,cy-y)<10,`${x},${y}: centroid ${cx.toFixed(1)},${cy.toFixed(1)}`);
  }
});
test('older saves without one can place a Town Center, which re-anchors growth without re-founding',()=>{
  const old=seedTown(makeCity('Old','plain',9)),n=old.buildings.length;
  assert.equal(townCenterLevel(old),null);
  const r=placeTownCenter(old,old.origin.x+4,old.origin.y);
  assert.equal(r.error,null);assert.equal(r.city.buildings.length,n,'nothing is rebuilt');
  assert.deepEqual(cityOrigin(r.city),{x:old.origin.x+4,y:old.origin.y});
});
test('upgrades need their era, population and treasury, cost money, and are logged',()=>{
  let c=founded(24,36,'river',42);
  assert.match(townCenterIssue({...c,funds:1e6}),/needs 3,000 residents/);
  c=grow(c,1420);
  assert.ok(stats(c).population>=TOWN_CENTER_LEVELS[1].minPopulation,'grown enough for a Town Square');
  assert.match(upgradeTownCenter({...c,funds:10}).error,/treasury/);
  c={...c,funds:5000};
  const up=upgradeTownCenter(c);
  assert.equal(up.error,null);assert.equal(up.city.center.level,2);
  assert.equal(up.city.funds,5000-TOWN_CENTER_LEVELS[1].cost);
  assert.match(up.city.events.at(-1).text,/Market Cross was rebuilt as the Town Square/);
  assert.match(townCenterIssue({...up.city,residents:1e7,funds:1e6}),/Civic Piazza is available from 1500/,'the piazza waits for its era');
  // Undo puts the old level and the money back.
  const back=revertEdit(up.city,up.undo);
  assert.equal(back.center.level,1);assert.equal(back.funds,5000);
  // The top level cannot be exceeded.
  assert.match(townCenterIssue({...c,center:{...c.center,level:TOWN_CENTER_LEVELS.length}}),/fully developed/);
});
test('each level widens the center’s services, land value and reach, and adds city-wide effects',()=>{
  const c=grow(founded(24,36,'river',42),1400),k=c.center.y*W+c.center.x+3;
  let prev={service:cityFields(c).service[k],prestige:cityFields(c).prestige[k],reach:cityReach(c,10000),prosperity:cityEffects(c).prosperity||0};
  for(let level=2;level<=TOWN_CENTER_LEVELS.length;level++){
    const at={...c,center:{...c.center,level}},f=cityFields(at);
    const now={service:f.service[k],prestige:f.prestige[k],reach:cityReach(at,10000),prosperity:cityEffects(at).prosperity||0};
    assert.ok(now.service>prev.service,`level ${level} service`);assert.ok(now.prestige>prev.prestige,`level ${level} land value`);
    assert.ok(now.reach>prev.reach,`level ${level} reach`);assert.ok(now.prosperity>prev.prosperity,`level ${level} prosperity`);
    prev=now;
  }
  // The founding cross alone changes nothing about the economy.
  const plain={...c,center:undefined};
  assert.deepEqual(cityEffects({...c,center:{...c.center,level:1}}),cityEffects(plain));
});
test('the map draws a grander Town Center at each level, and surveys remember its level',()=>{
  const c=founded(24,36,'river',42);let last=0;
  for(let level=1;level<=TOWN_CENTER_LEVELS.length;level++){
    const {ctx,arcs}=recorder();drawCity(ctx,{...c,center:{...c.center,level}},800,600,{layer:'urban',cartouche:false});
    const size=Math.max(...arcs.filter(a=>Math.abs(a.x-24.5)<.01&&Math.abs(a.y-36.5)<.01).map(a=>a.r));
    assert.ok(size>last,`level ${level} drawn larger (${size} vs ${last})`);last=size;
  }
  const snap=captureSnapshot(c),up={...c,center:{...c.center,level:3}};
  assert.equal(snapshotCity(up,snap).center.level,1,'an old survey shows the old Market Cross');
  const {center:_c,...oldSnap}=snap;
  assert.equal(snapshotCity(up,oldSnap).center.level,3,'pre-v1.5 surveys fall back to the present');
});

// ── sidebar follow-ups: district names and building plans ──
test('districts can be renamed, and keep the new name through later surveys and a reload',()=>{
  let c=grow(founded(40,36,'plain',5),1500);
  assert.ok(c.districts.length>=2,`${c.districts.length} districts`);
  const [a,b]=c.districts;
  const r=renameDistrict(c,a.id,'  Rosen   hof ');
  assert.equal(r.error,null);
  assert.equal(r.city.districts[0].name,'Rosen hof');assert.equal(r.city.districts[0].renamed,true);
  assert.match(r.city.events.at(-1).text,new RegExp(`${a.name} was renamed Rosen hof`));
  const later=grow(r.city,1560);
  assert.equal(later.districts.find(d=>d.id===a.id).name,'Rosen hof','the name survives re-surveys');
  assert.equal(normalizeCity(JSON.parse(JSON.stringify(later))).districts.find(d=>d.id===a.id).name,'Rosen hof');
  assert.equal(revertEdit(r.city,r.undo).districts[0].name,a.name,'undo restores the old name');
  assert.match(renameDistrict(r.city,b.id,'rosen HOF').error,/already called/);
  assert.match(renameDistrict(c,a.id,'   ').error,/needs a name/);
  assert.match(renameDistrict(c,a.id,'x'.repeat(DISTRICT_NAME_MAX+1)).error,/at most/);
  assert.match(renameDistrict(c,'nope','Elsewhere').error,/no longer exists/);
});
test('civic blocks are halls, courtyards and schools, not a row of identical churches',()=>{
  const isChurch=b=>buildingPlan(b).some(s=>s.tone==='tower');
  const blocks=[];for(let x=10;x<40;x++)blocks.push({id:`b${x}`,x:x+.08,y:20.08,w:.7,h:.7,type:'civic',born:1450+x*8,style:'timber',level:1});
  const churches=blocks.filter(isChurch).length;
  assert.ok(churches>0&&churches<blocks.length/2,`${churches}/${blocks.length} civic blocks drawn as churches`);
  assert.ok(isChurch({...blocks[1],informal:true}),'informal parish churches stay churches');
  assert.ok(!blocks.filter(b=>b.born>=1850).some(isChurch),'modern civic blocks are not churches');
  // Plans are deterministic, so a building looks the same every frame.
  assert.deepEqual(buildingPlan(blocks[3]),buildingPlan({...blocks[3]}));
});
