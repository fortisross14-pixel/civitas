import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLegacy,normalizeLegacy,openFigurePack,figurePackOdds,FIGURES,canBuy,buyLegacy,awardCityMilestones,awardCompletedCity,startRunProfile} from '../src/legacy.js';
import {ACHIEVEMENT_INDEX,achievementValues,achievementProgress} from '../src/achievements.js';
import {comparisonSeries} from '../src/chronicle.js';
import {auxiliaryOrigin,auxiliaryDestination} from '../src/navigation.js';

const city=(extra={})=>({id:'city-a',name:'A',year:1500,history:[],buildings:[],landmarks:[],events:[],snapshots:[],figures:[],...extra});
test('Compare and Market return to their source and cannot resume a deleted city',()=>{
 const origins={atlas:auxiliaryOrigin('game',true)};
 assert.equal(auxiliaryDestination(origins.atlas,true),'game');
 origins.market=auxiliaryOrigin('atlas',true,origins);
 assert.equal(auxiliaryDestination(origins.market,true),'game');
 assert.equal(auxiliaryDestination(origins.atlas,false),'home');
 assert.equal(auxiliaryOrigin('home',true,origins),'home');
});
test('unfinished city milestones award LP immediately, once across reloads and cities',()=>{
 const c=city(),s={population:20000,gdpPerCapita:5000,prosperity:71};
 const earned=awardCityMilestones(emptyLegacy(),c,s);
 for(const id of ['population_5000','population_10000','population_20000','income_1000','income_2500','income_5000','prosperity_70'])assert.ok(earned.claimedAchievements.includes(id));
 assert.equal(earned.completed.length,0);
 const total=earned.claimedAchievements.reduce((sum,id)=>sum+ACHIEVEMENT_INDEX[id].points,0);
 assert.equal(earned.points,total);assert.equal(earned.lifetimePoints,total);
 assert.deepEqual(awardCityMilestones(normalizeLegacy(JSON.parse(JSON.stringify(earned))),city({id:'another'}),s),earned);
 assert.deepEqual(awardCityMilestones(earned,c,{population:1}),earned,'decline never revokes rewards');
});
test('historical peaks count retroactively, future rows do not, and cities cannot pool targets',()=>{
 const a=city({history:[{year:1400,population:10000,gdpPerCapita:2500},{year:1800,population:1000000}]});
 const l=awardCityMilestones(emptyLegacy(),a,{population:4000});
 assert.ok(l.claimedAchievements.includes('population_10000'));assert.ok(!l.claimedAchievements.includes('population_20000'));
 assert.equal(achievementProgress([city({history:[{year:1400,population:3000}]}),city({id:'b',history:[{year:1400,population:3000}]})]).find(a=>a.id==='population_5000').value,3000);
});
test('construction counts player commissions, including lost buildings, but not seeded homes',()=>{
 const c=city({buildings:Array.from({length:50},(_,i)=>({id:String(i),type:'res',born:1300})),landmarks:[{id:'seed',kind:'church'}],events:[]});
 assert.equal(achievementValues(c).commissions,0);
 c.events=Array.from({length:5},(_,i)=>({year:1400+i,type:'landmark',text:`Market constructed at parcel ${i}, 4 — a civic investment.`}));
 const l=awardCityMilestones(emptyLegacy(),c);
 for(const id of ['builder_1','builder_3','builder_5'])assert.ok(l.claimedAchievements.includes(id));
 assert.ok(!l.claimedAchievements.includes('builder_10'));
});
test('milestone card gates open during a run; completion remains a separate one-time bonus',()=>{
 const c=city(),sample={population:50000,gdpPerCapita:5000,culturalPrestige:120,religiousInfluence:0,educationIndex:0,prosperity:75};
 let l=awardCityMilestones(emptyLegacy(),c,sample);
 assert.equal(canBuy({...l,points:1000},'card','tourist_paradise').ok,true);
 const before=l.points;
 l=awardCompletedCity(l,{...c,finished:true,year:2030},sample);
 assert.ok(l.points>before);assert.deepEqual(awardCompletedCity(l,{...c,finished:true},sample),l);
});
test('old profiles preserve unlocks and receive milestone LP only once',()=>{
 const old={points:10,achievements:['cultural_rebirth','pop_10k'],unlockedFigures:['tesla'],upgrades:{patron:2},completed:['old']};
 const l=awardCityMilestones(normalizeLegacy(old),city());
 assert.ok(l.achievements.includes('population_10000'));assert.equal(l.unlockedFigures[0],'tesla');assert.equal(l.upgrades.patron,2);
 assert.ok(l.points>10);assert.deepEqual(awardCityMilestones(l,city()),l);
});
test('packs debit exact LP and add random unowned figures to future city pools',()=>{
 const l={...emptyLegacy(),points:1000};
 const a=openFigurePack(l,'discovery',()=>0);assert.equal(a.legacy.points,900);assert.equal(a.figure.rarity,'rare');assert.equal(l.unlockedFigures.length,0);
 const b=openFigurePack(a.legacy,'discovery',()=>0);assert.notEqual(a.figure.id,b.figure.id);assert.equal(b.legacy.packs.opened,2);
 assert.ok(startRunProfile(b.legacy,[a.figure.id]).figurePool.includes(a.figure.id));
 assert.equal(openFigurePack(emptyLegacy(),'grand').figure,null);
 assert.equal(openFigurePack(l,'invalid').figure,null);
 assert.equal(canBuy(l,'figure','tesla').ok,false);assert.deepEqual(buyLegacy(l,'pack','discovery'),normalizeLegacy(l));
});
test('published pack odds match rarity selection and saved guarantees',()=>{
 const l={...emptyLegacy(),points:10000};
 assert.deepEqual(figurePackOdds(l,'discovery').map(o=>[o.rarity,o.chance]),[['rare',.7],['epic',.25],['legend',.05]]);
 assert.equal(openFigurePack(l,'discovery',()=>.8).figure.rarity,'epic');
 assert.equal(openFigurePack(l,'discovery',()=>.99).figure.rarity,'legend');
 const pity=normalizeLegacy({...l,packs:{opened:4,sinceEpic:4,sinceLegend:4}});
 assert.ok(figurePackOdds(pity,'discovery').every(o=>o.rarity!=='rare'));
 assert.equal(openFigurePack(pity,'discovery',()=>0).figure.rarity,'epic');
 const legend=normalizeLegacy({...l,packs:{opened:11,sinceEpic:3,sinceLegend:11}});
 const result=openFigurePack(legend,'discovery',()=>0);
 assert.equal(result.figure.rarity,'legend');assert.equal(result.legacy.packs.sinceLegend,0);assert.equal(result.legacy.packs.sinceEpic,0);
 assert.deepEqual(normalizeLegacy(JSON.parse(JSON.stringify(pity))).packs,pity.packs);
});
test('duplicate protection discovers the whole collection and blocks exhausted packs',()=>{
 let l={...emptyLegacy(),points:100000};
 const total=FIGURES.filter(f=>!f.generic).length;
 for(let i=0;i<total;i++){const result=openFigurePack(l,'discovery',()=>0);assert.ok(result.figure);l=result.legacy;}
 assert.equal(new Set(l.unlockedFigures).size,total);assert.equal(l.packs.opened,total);
 assert.equal(canBuy(l,'pack','discovery').ok,false);
 assert.equal(openFigurePack(l,'discovery').legacy.points,l.points);
 const highOwned={...emptyLegacy(),points:1000,unlockedFigures:FIGURES.filter(f=>!f.generic&&f.rarity!=='rare').map(f=>f.id)};
 assert.equal(canBuy(highOwned,'pack','grand').ok,false);
 assert.equal(figurePackOdds(highOwned,'discovery')[0].chance,1);
});
test('comparison shares a period, adds a current endpoint and never projects into the future',()=>{
 const a=city({year:1500,history:[{year:1300,population:100},{year:1400,population:200},{year:1700,population:99999}]}),b=city({id:'b',year:1400,history:[{year:1350,population:50}]});
 const rows=comparisonSeries([a,b],'population',1350,1500,new Map([['city-a',{population:300}],['b',{population:80}]]));
 assert.deepEqual(rows[0].points,[{year:1400,value:200},{year:1500,value:300}]);
 assert.deepEqual(rows[1].points,[{year:1350,value:50},{year:1400,value:80}]);
 assert.equal(comparisonSeries([a],'gdp',1300,1500)[0].points.length,0);
 assert.deepEqual(comparisonSeries([a],'population',1500,1500,new Map([['city-a',{population:300}]]))[0].points,[{year:1500,value:300}]);
});
