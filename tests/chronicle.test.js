import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCity,seedTown,advance,stats} from '../src/sim.js';
import {METRICS,HISTORICAL_CITIES,historyAt,metricAt,metricSeries,cityRecords,timelineItems,atlasRecords,compareAt,historicalPopulationsAt,identityOf,shareSummary} from '../src/chronicle.js';
function sampleCity(name,id){const c=seedTown(makeCity(name,'plain',123));c.id=id;return c;}
test('chronicle exposes comparable metrics and no historical GDP facts',()=>{
 assert.ok(METRICS.gdpPerCapita);assert.ok(METRICS.population);
 assert.equal(compareAt([],1900,'gdp').length,0);
 assert.equal(historicalPopulationsAt(1500).length,0);
});
test('historical benchmark values retain their observation years and linked sources',()=>{
 const ny=historicalPopulationsAt(1900).find(r=>r.name==='New York City');
 const barcelona=historicalPopulationsAt(1900).find(r=>r.name==='Barcelona');
 const london=historicalPopulationsAt(1900).find(r=>r.name==='London');
 assert.equal(ny.value,3437202);assert.equal(ny.year,1900);
 assert.equal(barcelona.value,544137);
 assert.equal(london.value,6226494);assert.equal(london.year,1901);
 for(const c of HISTORICAL_CITIES){assert.ok(c.url.startsWith('https://'));assert.ok(c.definition);assert.ok(c.samples.every(([y,v])=>Number.isInteger(y)&&v>0));}
});
test('Barcelona city must not be confused with provincial census',()=>{
 assert.equal(historicalPopulationsAt(1950).find(x=>x.id==='barcelona').value,1280179);
});
test('city chronology never reads later samples for earlier years',()=>{
 const c=sampleCity('Valdoria','a');
 c.history.push({year:1600,population:500,gdp:20000},{year:1700,population:950,gdp:36000});c.year=1700;
 assert.equal(metricAt(c,1650,'population'),500);
 assert.equal(historyAt(c,1290),null);
 assert.equal(metricAt(c,1700,'gdp'),36000);
 const series=metricSeries(c,'gdp');assert.equal(series.at(-1).year,1700);
});
test('comparison omits city records after an unfinished game year',()=>{
 const c=sampleCity('Valdoria','a');c.year=1550;
 assert.equal(compareAt([c],1800,'population',{includeHistorical:false}).length,0);
 assert.equal(compareAt([c],1500,'population',{includeHistorical:false})[0]?.year,1300);
});
test('comparison ranks player and recorded historical population but no historical GDP',()=>{
 const city=sampleCity('Testcity','s');city.year=1900;city.history.push({year:1900,population:9999999,gdp:500,gdpPerCapita:200});
 const population=compareAt([city],1900,'population');assert.equal(population[0].name,'Testcity');assert.ok(population.some(v=>v.kind==='historical'));
 const GDP=compareAt([city],1900,'gdp');assert.deepEqual(GDP.map(v=>v.kind),['player']);
});
test('record book calculates peaks and oldest surviving structures',()=>{
 const c=sampleCity('Oldtown','old');c.year=1700;
 c.history.push({year:1500,population:3600,gdp:900},{year:1550,population:2400,gdp:1500000000});
 c.buildings.push({id:'test',x:1,y:1,type:'res',born:1450});
 const records=cityRecords(c);
 assert.equal(records.population.year,1500);assert.equal(records.gdp.year,1550);
 assert.equal(records.oldestSurvivor.born,Math.min(...c.buildings.map(v=>v.born)));
 assert.equal(records.mostGrowth.year,1500);
});
test('events and population milestones are ordered and filtered',()=>{
 const c=sampleCity('Chronicle','c');c.year=1500;
 c.history.push({year:1400,population:1400},{year:1450,population:6000});
 c.events.push({year:1420,type:'fire',text:'A fire damaged buildings.'});
 c.turning.choices.push({year:1430,cardId:'new_settlers'});
 const timeline=timelineItems(c);
 assert.ok(timeline.length>=3);
 assert.deepEqual(timeline.map(e=>e.year),timeline.map(e=>e.year).sort((a,b)=>a-b));
 assert.ok(timeline.some(e=>e.category==='crisis'));
 assert.ok(timeline.some(e=>e.category==='milestone'));
 assert.ok(timeline.some(e=>e.category==='decision'));
});
test('personal atlas records use peak values instead of last year',()=>{
 const a=sampleCity('A','a'),b=sampleCity('B','b');
 a.history.push({year:1500,population:9999,culturalPrestige:25},{year:1600,population:1000,culturalPrestige:7});
 b.history.push({year:1600,population:3000,culturalPrestige:150});
 const r=atlasRecords([a,b]);assert.equal(r.largest.city.id,'a');assert.equal(r.largest.peak.year,1500);assert.equal(r.cultural.city.id,'b');
 assert.ok(identityOf(a));assert.match(shareSummary(a),/CIVITAS/);
});
