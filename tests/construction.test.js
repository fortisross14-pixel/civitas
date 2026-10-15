import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,placeConstruction,stats,selectTurningPoint,normalizeCity,terrain,W,H,cityEffects,advance} from '../src/sim.js';
import {basicsForYear,BASIC_BUILDINGS,figureEraEligible} from '../src/construction.js';
import {FIGURE_INDEX} from '../src/legacy.js';
import {modifiers,activeSynergies} from '../src/turningPoints.js';

function town(seed=9,type='river'){return seedTown(makeCity('Construction',type,seed));}
function pick(city,card){return selectTurningPoint({...city,turning:{...city.turning,pending:{index:city.turning.choices.length,year:city.year,options:[card]}}},card);}
function buildAnywhere(city,id){let last='';for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){const result=placeConstruction(city,id,x,y);if(!result.error)return result;last=result.error;}throw Error(`No build site: ${id}: ${last}`);}

test('two ordinary civic buildings per era; there are no arbitrary extraordinary buildings',()=>{
 assert.equal(BASIC_BUILDINGS.length,12);
 for(const year of [1300,1500,1750,1850,1950,2000]){
  const basics=basicsForYear(year);assert.equal(basics.length,2,`year ${year}`);
  assert.ok(basics.every(b=>b.start<=year&&b.end>=year));
 }
 assert.ok(!BASIC_BUILDINGS.some(b=>['university','port','monument','monastery'].includes(b.kind)));
});
test('card construction creates a project but neither a building nor a card bonus before placement',()=>{
 const base=town(7);const c=pick(base,'hire_artists');
 assert.equal(c.projects.length,1);assert.equal(c.projects[0].kind,'workshop');assert.equal(c.buildings.length,base.buildings.length);
 assert.equal(c.landmarks.length,0);assert.equal(modifiers(c).arts,undefined);
 assert.equal(stats(c).culturalPrestige,stats(base).culturalPrestige);
 assert.ok(c.events.some(e=>e.type==='project'));
 const {city:built,error}=buildAnywhere(c,c.projects[0].id);
 assert.equal(error,null);assert.equal(built.projects.length,0);assert.equal(built.landmarks.length,1);
 assert.ok((modifiers(built).arts||0)>=.30);assert.ok(stats(built).culturalPrestige>stats(base).culturalPrestige);
 assert.equal(modifiers(c).arts,undefined,'previous save state stays immutable');
});
test('a failed construction keeps the project, its funds and its status intact',()=>{
 let c=pick(town(),'hire_artists');const before=c.funds;
 const project=c.projects[0];
 let result=placeConstruction(c,project.id,27,28); // central neighborhood could be free, so use a known occupied building
 const occupied=c.buildings[0];result=placeConstruction(c,project.id,Math.floor(occupied.x),Math.floor(occupied.y));
 assert.match(result.error,/occupies/);assert.equal(result.city,c);assert.equal(c.projects.length,1);assert.equal(c.funds,before);
 const water=[...Array(W)].flatMap((_,x)=>[...Array(H)].map((_,y)=>({x,y}))).find(p=>terrain(c.type,p.x,p.y)==='water');
 const wet=placeConstruction(c,project.id,water.x,water.y);
 assert.match(wet.error,/dry land/);assert.equal(wet.city,c);
});
test('port commission requires shore, cannot be built inland, and is not consumed on failure',()=>{
 let c=town(5,'river');c.year=1500;c=pick(c,'great_port');const p=c.projects[0];
 assert.ok(p);let inland=null;
 for(let y=4;y<H-4&&!inland;y++)for(let x=4;x<W-4;x++)if(terrain(c.type,x,y)==='land'&&[[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy])=>terrain(c.type,x+dx,y+dy)==='land')){const v=placeConstruction(c,p.id,x,y);if(/Ports need/.test(v.error||''))inland=v;}
 assert.ok(inland);assert.equal(c.projects.length,1);
 const result=buildAnywhere(c,p.id);assert.equal(result.placed.special,'port');assert.equal(result.city.projects.length,0);
});
test('era-appropriate civic structures cost treasury, affect economy and are limited to two',()=>{
 let c=town(15,'plain');const start=c.funds;
 assert.ok(basicsForYear(c.year).some(v=>v.kind==='market'));
 const first=buildAnywhere(c,'market');c=first.city;
 assert.equal(c.funds,start-130);assert.equal(c.landmarks[0].kind,'market');
 assert.ok(cityEffects(c).trade>=.10);
 c=buildAnywhere(c,'market').city;
 const third=placeConstruction(c,'market',22,2);assert.match(third.error,/Maximum of two/);
 c={...c,year:1510,funds:20000};
 assert.match(placeConstruction(c,'chapel',35,20).error,/only during/);
 const next=buildAnywhere(c,'school');assert.equal(next.placed.special,'school');
 assert.ok(stats(next.city).educationIndex>stats(c).educationIndex);
});
test('cards must be placed to complete landmark-based named synergies',()=>{
 let c=town(32);c=pick(c,'hire_artists');c=pick(c,'grand_workshops');c=pick(c,'cultural_renaissance');
 assert.equal(activeSynergies(c).some(v=>v.id==='renaissance'),false);
 c=buildAnywhere(c,c.projects[0].id).city;
 assert.equal(activeSynergies(c).some(v=>v.id==='renaissance'),true);
});
test('a legendary historical figure awards commissions and does not conjure monuments',()=>{
 let c=town(20);c.year=1630;c.funds=20000;c=pick(c,'figure:michelangelo');
 assert.ok(c.figures.some(f=>f.id==='michelangelo'));assert.equal(c.projects.length,2);
 assert.equal(c.buildings.filter(b=>b.special==='monument').length,0);
 c=buildAnywhere(c,c.projects[0].id).city;c=buildAnywhere(c,c.projects[0].id).city;
 assert.equal(c.buildings.filter(b=>b.special==='monument').length,2);
});
test('people are eligible across broad historical eras, not just their real lifetimes',()=>{
 assert.equal(figureEraEligible(FIGURE_INDEX.michelangelo,1675),true);
 assert.equal(figureEraEligible(FIGURE_INDEX.michelangelo,1890),false);
 assert.equal(figureEraEligible(FIGURE_INDEX.ibn_khaldun,1475),true);
 assert.equal(figureEraEligible(FIGURE_INDEX.ibn_khaldun,1600),false);
 assert.equal(figureEraEligible(FIGURE_INDEX.gaudi,1935),true);
 assert.equal(figureEraEligible(FIGURE_INDEX.gaudi,2030),false);
});
test('old v0.4 card-placed buildings keep their bonuses and are not duplicated on migration',()=>{
 let old=town(12);old=pick(old,'hire_artists');old=buildAnywhere(old,old.projects[0].id).city;
 old={...old,schema:4,projects:undefined,landmarks:old.landmarks.map(({source,...l})=>l)};
 const migrated=normalizeCity(old);
 assert.equal(migrated.schema,8);assert.equal(migrated.projects.length,0);
 assert.equal(migrated.landmarks[0].source,'choice:0');assert.ok(modifiers(migrated).arts>=.30);
 assert.equal(migrated.buildings.filter(b=>b.special==='workshop').length,1);
});
test('building placement and chronological advance are deterministic and survive JSON restoration',()=>{
 let a=town(77),b=normalizeCity(JSON.parse(JSON.stringify(a)));
 a=pick(a,'hire_artists');b=pick(b,'hire_artists');
 a=buildAnywhere(a,a.projects[0].id).city;
 b=buildAnywhere(b,b.projects[0].id).city;
 assert.deepEqual(normalizeCity(a),normalizeCity(b));
 const restored=normalizeCity(JSON.parse(JSON.stringify(a)));
 assert.deepEqual(restored.projects,a.projects);
 a=advance(a,25);b=advance(restored,25);
 assert.deepEqual(a.history,b.history);
});
