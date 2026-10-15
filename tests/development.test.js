import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,addZone,advance,selectTurningPoint,placeConstruction,stats,normalizeCity} from '../src/sim.js';
import {AXES,INITIAL_DEVELOPMENT,DECAY_PER_YEAR,developmentOf,applyPulse,advanceDevelopment,accumulateDevelopment,productivityGrowth,developmentCapacity,institutionalSupport} from '../src/development.js';
import {campaign} from './helpers/balance-fixture.js';

const forced=(city,id)=>selectTurningPoint({...city,turning:{...city.turning,pending:{index:city.turning.choices.length,year:city.year,options:[id]}}},id);

test('development conditions are consistently named, finite, and range from 0 to 100',()=>{
 const city=makeCity('Momentum','plain',61);
 assert.equal(AXES.length,6);
 for(const k of AXES){assert.equal(developmentOf(city)[k],INITIAL_DEVELOPMENT[k]);assert.ok(DECAY_PER_YEAR[k]>0);}
 const clipped=developmentOf({...city,development:{economy:105,technology:-8,culture:NaN}});
 assert.equal(clipped.economy,100);assert.equal(clipped.technology,0);
 assert.ok(!Number.isNaN(clipped.culture));
});
test('economic miracle can move an economic score from 48 to 88 in one choice',()=>{
 let c=seedTown(makeCity('Golden era','plain',133));c.development={...c.development,economy:48};
 c=forced(c,'economic_miracle');assert.ok(c.development.economy>=88&&c.development.economy<=100,JSON.stringify(c.development));
});
test('every development score decays without action and eras have different decay speeds',()=>{
 const c={...makeCity('Decay'),development:Object.fromEntries(AXES.map(k=>[k,88]))};
 const a=advanceDevelopment(c,35),b=advanceDevelopment(a,35);
 for(const k of AXES){assert.ok(a.development[k]<88,k);assert.ok(b.development[k]<a.development[k],k);assert.ok(a.development[k]>30,k);}
 assert.ok(a.development.culture>a.development.infrastructure);
});
test('an excellent score compounds GDP per worker faster than an ordinary or collapsed city',()=>{
 const low={economy:0,technology:0},standard={economy:20,technology:20},high={economy:88,technology:88};
 const rates=[low,standard,high].map(d=>productivityGrowth(1980,d));
 assert.ok(rates[0]<0);assert.ok(rates[1]>.015&&rates[1]<.021);assert.ok(rates[2]>.028);
 const city=makeCity('Compounding');city.year=1980;
 const poor={...city,productivityStock:15000,development:{...city.development,...low}};
 const rich={...city,productivityStock:15000,development:{...city.development,...high}};
 const a=accumulateDevelopment(poor,20),b=accumulateDevelopment(rich,20);
 assert.ok(b.productivityStock>a.productivityStock*1.55);
 assert.ok(a.productivityStock<15000);
});
test('momentum fades but earned productivity and heritage remain',()=>{
 let c=makeCity('Legacy');c.year=1900;c.development={...c.development,economy:90,technology:90,culture:85,faith:85};
 c=accumulateDevelopment(c,15);const earned=c.productivityStock,art=c.culturalCapital,religion=c.sacredCapital;
 const faded=advanceDevelopment(c,40);
 assert.ok(faded.development.economy<90);assert.equal(faded.productivityStock,earned);
 assert.equal(faded.culturalCapital,art);assert.equal(faded.sacredCapital,religion);
});
test('a university project only produces institutional support after player placement',()=>{
 let c=seedTown(makeCity('College','plain',932));c.year=1550;
 c=forced(c,'free_university');
 assert.ok(c.projects.some(p=>p.kind==='university'));
 assert.equal(institutionalSupport(c).technology,0);
 let placed=null;
 for(let y=3;y<69&&!placed;y++)for(let x=3;x<96&&!placed;x++){
  const p=placeConstruction(c,c.projects[0].id,x,y);if(!p.error)placed=p.city;
 }
 assert.ok(placed);assert.ok(institutionalSupport(placed).technology>0);
 assert.ok(placed.development.technology>c.development.technology);
});
test('legendary figures support future technology momentum without making it permanent 100',()=>{
 const city=makeCity('Great Minds');city.figures=[{id:'tesla',domain:'education',rarity:'legend',effects:{education:.8}}];
 city.development={...city.development,technology:95};
 const retained=advanceDevelopment(city,100);
 const alone=advanceDevelopment({...city,figures:[]},100);
 assert.ok(retained.development.technology>alone.development.technology+9);
 assert.ok(retained.development.technology<95);
});
test('accumulated urban knowledge unlocks higher physical housing capacity',()=>{
 const c=makeCity('Towers');c.year=2000;c.productivityStock=30000;
 const a=developmentCapacity(c),b=developmentCapacity({...c,knowledgeCapital:700});
 assert.ok(b>a*3);
 assert.ok(b<=16);
});
test('the same region and initial zoning can finish with dramatically different economic trajectories',()=>{
 const a=campaign(410,'balanced','default',false,'plain');
 const b=campaign(410,'balanced','default',true,'plain');
 assert.ok(b.gdpPC>a.gdpPC*2);
 assert.ok(b.population>a.population*1.08);
 for(const k of AXES)assert.ok(b.city.history.every(h=>h.development?.[k]===undefined||(h.development[k]>=0&&h.development[k]<=100)));
});
test('full-run score history and accumulated productivity survive JSON save and migration',()=>{
 const c=campaign(313,'compact','culture',false,'river').city;
 const d=normalizeCity(JSON.parse(JSON.stringify(c)));
 assert.equal(d.schema,8);assert.equal(d.productivityStock,c.productivityStock);
 assert.deepEqual(d.development,c.development);
 assert.equal(stats(d).gdpPerCapita,stats(c).gdpPerCapita);
 assert.ok(d.history.some(h=>Number.isFinite(h.economyScore)));
 assert.ok(d.history.every(h=>!h.development||AXES.every(k=>h.development[k]>=0&&h.development[k]<=100)));
});
test('older saves migrate to independent momentum scores without losing city history',()=>{
 const c=seedTown(makeCity('Old City','river',91));
 delete c.productivityStock;delete c.development;c.schema=7;
 const d=normalizeCity(JSON.parse(JSON.stringify(c)));
 assert.equal(d.schema,8);assert.ok(d.productivityStock>0);
 assert.equal(d.history.length,c.history.length);
 assert.equal(d.buildings.length,c.buildings.length);
 for(const k of AXES)assert.ok(Number.isFinite(d.development[k]));
});

test('modern baseline growth is approximately 2%, exceptional momentum exceeds 3%, and zero momentum contracts',()=>{
 const normal=productivityGrowth(2020,{economy:20,technology:20});
 const exceptional=productivityGrowth(2020,{economy:88,technology:88});
 const collapsed=productivityGrowth(2020,{economy:0,technology:0});
 assert.ok(normal>=.018&&normal<=.021,normal);
 assert.ok(exceptional>.03&&exceptional<.036,exceptional);
 assert.ok(collapsed<0,collapsed);
});
test('immediate card momentum is correctly recorded in same-year historical data',()=>{
 let c=seedTown(makeCity('Snapshot check','plain',453));
 c=advance(c,100);
 assert.ok(c.turning.pending);
 const before=c.development.economy;
 c=selectTurningPoint({...c,turning:{...c.turning,pending:{...c.turning.pending,options:['economic_miracle']}}},'economic_miracle');
 assert.ok(c.development.economy>before+20);
 const record=c.history.at(-1);
 assert.equal(record.year,c.year);
 assert.equal(record.economyScore,c.development.economy);
 assert.equal(record.development.economy,c.development.economy);
});

test('high productivity compounds with diminishing returns instead of reaching the ceiling immediately',()=>{
 const base=makeCity('Frontier');base.year=1980;
 base.development={...base.development,economy:90,technology:90};
 const emerging=accumulateDevelopment({...base,productivityStock:10000},20);
 const mature=accumulateDevelopment({...base,productivityStock:60000},20);
 assert.ok(emerging.productivityStock>10000*1.5);
 assert.ok(mature.productivityStock>60000);
 assert.ok(mature.productivityStock<100000,'growth beyond a high frontier must have diminishing returns');
 assert.ok((mature.productivityStock/60000)<(emerging.productivityStock/10000),'a mature economy should grow proportionately slower');
});
