import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_INDEX,CARDS,DOMAINS,SYNERGIES,turningYears,generateOffers,modifiers,activeSynergies,canDraw} from '../src/turningPoints.js';
import {makeCity,seedTown,addZone,advance,selectTurningPoint,rerollTurningPoint,getOpportunity,normalizeCity,stats,terrain,W,H,snapshotCity,captureSnapshot,placeConstruction} from '../src/sim.js';
import {FIGURES,FIGURE_INDEX,LOCKED_CARDS,BASE_CARDS,emptyLegacy,normalizeLegacy,marketCost,canBuy,buyLegacy,startRunProfile,awardCompletedCity,scoreCity} from '../src/legacy.js';

function town(seed=42,type='river',profile=null){let c=seedTown(makeCity('Test city',type,seed));if(profile){c.turning={...c.turning,cardPool:profile.cardPool,figurePool:profile.figurePool,featuredFigures:profile.featuredFigures};c.legacyBonuses=profile.legacyBonuses;}return c;}
function placeAwarded(city,kind=null){
 const project=city.projects.find(p=>!kind||p.kind===kind);assert.ok(project,'Expected pending building commission');
 for(let y=3;y<H-3;y++)for(let x=3;x<W-3;x++){
  const {city:next,error}=placeConstruction(city,project.id,x,y);
  if(!error)return next;
 }
 throw new Error('No valid parcel found for '+project.kind);
}
function selectForced(city,cardId){assert.ok(getOpportunity(cardId));const pending={index:city.turning.choices.length+(city.turning.skipped||0),year:city.year,options:[cardId]};return selectTurningPoint({...city,turning:{...city.turning,pending}},cardId);}
function complete(c,mode='first'){let loops=0;while(c.year<2030&&loops++<70){const old=c.year;c=advance(c,1000);if(c.turning.pending){const id=mode==='last'?c.turning.pending.options.at(-1):c.turning.pending.options[0];c=selectTurningPoint(c,id);}if(c.year===old)throw new Error('Stalled');}assert.equal(c.year,2030);return c;}

test('card catalogue has 54 unique, complete, playable opportunities and 10 synergies',()=>{
 assert.equal(CARDS.length,54);assert.equal(new Set(CARDS.map(c=>c.id)).size,54);
 assert.equal(SYNERGIES.length,10);
 for(const c of CARDS){assert.ok(c.name&&c.description&&DOMAINS[c.domain]);assert.ok(Object.keys(c.effects).length);assert.ok(['common','uncommon','rare','epic'].includes(c.rarity));assert.ok(['instant','permanent','scaling','synergy','landmark','temporary'].includes(c.kind));}
 for(const combo of SYNERGIES){assert.ok(combo.needs.length>=3);assert.ok(combo.needs.every(id=>CARD_INDEX[id]));}
});
test('20 chronological milestones are strictly increasing and stop before campaign completion',()=>{
 const years=turningYears();assert.equal(years.length,20);assert.equal(years[0],1335);assert.equal(years.at(-1),1995);assert.ok(years.every((y,i)=>i===0||y>years[i-1]));
});
test('advancing +100 stops at milestone and requires exactly one of three choices',()=>{
 let c=town(21);c=advance(c,100);assert.equal(c.year,1335);assert.equal(c.turning.pending.index,0);assert.equal(c.turning.pending.options.length,3);
 const again=advance(c,100);assert.equal(again,c);
 const old=selectTurningPoint(c,'not-real');assert.equal(old,c);
 const choice=c.turning.pending.options[1];c=selectTurningPoint(c,choice);assert.equal(c.turning.choices.length,1);assert.equal(c.turning.pending,null);
 assert.equal(selectTurningPoint(c,choice),c,'cannot claim same opportunity twice');
 c=advance(c,100);assert.equal(c.year,1370);assert.equal(c.turning.pending.index,1);
});
test('offers are deterministic even when the user makes smaller time jumps',()=>{
 let a=town(199),b=town(199);a=advance(a,100);for(let i=0;i<7;i++)b=advance(b,5);
 assert.equal(a.year,1335);assert.equal(b.year,1335);assert.deepEqual(a.turning.pending.options,b.turning.pending.options);
 const choice=a.turning.pending.options[0];a=selectTurningPoint(a,choice);b=selectTurningPoint(b,choice);
 a=advance(a,100);for(let i=0;i<7;i++)b=advance(b,5);
 assert.deepEqual(a.turning.pending.options,b.turning.pending.options);
 assert.deepEqual(a.history,b.history);
});
test('rerolls are limited and cannot mutate the original offer',()=>{
 let c=advance(town(2),100);const prior=c.turning.pending.options;let r=rerollTurningPoint(c);
 assert.notEqual(r,c);assert.notDeepEqual(r.turning.pending.options,prior);assert.deepEqual(c.turning.pending.options,prior);
 r=rerollTurningPoint(r);assert.equal(r.turning.rerollsUsed,2);assert.equal(rerollTurningPoint(r),r);
});
test('without port geography, no port card or historic engineer figure can be drawn',()=>{
 const c=town(12,'plain');c.year=1870;c.turning.figurePool=['brunel'];
 assert.equal(canDraw(CARD_INDEX.great_port,c),false);
 assert.equal(canDraw(getOpportunity('figure:brunel'),c),false);
 assert.equal(generateOffers(c,5,0,FIGURES.map(f=>getOpportunity(`figure:${f.id}`))).includes('great_port'),false);
});
test('new cities apply the purchased deck, and cards outside that deck cannot be offered',()=>{
 const profile=startRunProfile(emptyLegacy(),[]);const c=town(1,'plain',profile);
 assert.equal(profile.cardPool.length,30);assert.equal(canDraw(CARD_INDEX.industrial_revolution,c),false);
 const available=generateOffers(c,0,0,FIGURES.map(f=>getOpportunity(`figure:${f.id}`)));
 assert.equal(available.length,3);
 assert.ok(available.every(id=>id.startsWith('figure:')||profile.cardPool.includes(id)));
});
test('repeatable instant cards cannot be taken more than twice in a run',()=>{
 let c=town(18);c=selectForced(c,'great_migration');c=selectForced(c,'great_migration');
 assert.equal(canDraw(CARD_INDEX.great_migration,c),false);
 assert.equal(modifiers(c).popInstant,undefined);
});
test('population, density and commerce cards affect real city metrics',()=>{
 let base=town(77),boost=town(77);
 boost=selectForced(boost,'dense_living');
 assert.ok(stats(boost).capacity>stats(base).capacity*1.2);
 boost=selectForced(boost,'land_opportunity');
 base=addZone(base,13,7,40,45,'res');boost=addZone(boost,13,7,40,45,'res');
 base=addZone(base,15,53,41,14,'trade');boost=addZone(boost,15,53,41,14,'trade');
 base=advance(base,25);boost=advance(boost,25);
 assert.ok(stats(boost).population>=stats(base).population);
 const economy=selectForced(base,'commercial_revolution');
 assert.ok(stats(economy).gdp>stats(base).gdp);
});
test('recruitable figures become active permanent modifiers and unique landmarks',()=>{
 let c=town(28);
 c=selectForced(c,'figure:local_artist');
 assert.equal(c.figures.length,1);assert.equal(c.landmarks.some(l=>l.kind==='workshop'),false);assert.equal(c.projects.length,1);c=placeAwarded(c,'workshop');assert.ok(c.landmarks.some(l=>l.kind==='workshop'));
 assert.ok(modifiers(c).arts>=.18);
 const workshop=c.buildings.find(b=>b.special==='workshop');assert.ok(workshop&&workshop.protected);
 assert.equal(terrain(c.type,Math.floor(workshop.x),Math.floor(workshop.y)),'land');
 const duplicate=selectForced(c,'figure:local_artist');assert.equal(duplicate.figures.length,2);
});
test('a culturally focused chain activates a named combination and improves appeal',()=>{
 const first=town(81);let culture=town(81);
 const before=stats(first).culturalPrestige;
 culture=selectForced(culture,'hire_artists');assert.ok(!activeSynergies(culture).length);culture=placeAwarded(culture,'workshop');culture=selectForced(culture,'grand_workshops');culture=selectForced(culture,'cultural_renaissance');
 assert.ok(activeSynergies(culture).some(s=>s.id==='renaissance'));
 assert.ok(stats(culture).culturalPrestige>before+8);
 culture=advance(culture,30);assert.ok(culture.projects.some(p=>p.kind==='monument'),'artists should commission a masterpiece for player placement');assert.equal(culture.landmarks.some(l=>l.kind==='monument'),false,'masterpieces cannot materialize automatically');culture=placeAwarded(culture,'monument');assert.ok(culture.landmarks.some(l=>l.kind==='monument')); 
});
test('a holy-city path creates religious institutions with strong measurable influence',()=>{
 let c=town(9);const base=stats(c).religiousInfluence;
 c=selectForced(c,'spiritual_awakening');c=selectForced(c,'sacred_architecture');c=placeAwarded(c,'shrine');c=selectForced(c,'great_pilgrimage');
 assert.ok(activeSynergies(c).some(s=>s.id==='holy_city'));
 assert.ok(c.landmarks.some(l=>l.kind==='shrine'));
 assert.ok(stats(c).religiousInfluence>base*2);
});
test('temporary bonuses expire while permanent bonuses persist',()=>{
 let c=town(53);c=selectForced(c,'economic_miracle');c=selectForced(c,'patron_arts');
 assert.ok((modifiers(c).gdp||0)>=.25);
 c=selectForced(c,'golden_age');c=selectForced(c,'new_settlers');
 assert.ok(modifiers(c).arts>=.4);
 assert.ok(modifiers(c).gdp>=.2);
 c=selectForced(c,'dense_living');assert.equal(modifiers(c).gdp,undefined);
});
test('legacy market prevents overspending, purchases unlock cards and improves subsequent cities',()=>{
 let l=normalizeLegacy({...emptyLegacy(),points:800,achievements:['industrial_hub']});
 assert.equal(canBuy(l,'card','industrial_revolution').ok,true);
 const initial=l.points;
 l=buyLegacy(l,'card','industrial_revolution');assert.ok(l.points<initial);assert.ok(l.unlockedCards.includes('industrial_revolution'));
 const twice=buyLegacy(l,'card','industrial_revolution');assert.deepEqual(twice,l);
 l=buyLegacy(l,'upgrade','patron');assert.equal(l.upgrades.patron,1);
 const profile=startRunProfile(l,[]);assert.ok(profile.cardPool.includes('industrial_revolution'));assert.equal(profile.legacyBonuses.arts,.10);
 assert.ok(!startRunProfile(emptyLegacy(),[]).cardPool.includes('industrial_revolution'));
});
test('legendary figures require an Epic Patron achievement and legitimate currency',()=>{
 let l=normalizeLegacy({...emptyLegacy(),points:2000});
 assert.equal(canBuy(l,'figure','michelangelo').ok,false);
 l.achievements.push('epic_patron');assert.equal(canBuy(l,'figure','michelangelo').ok,true);
 l=buyLegacy(l,'figure','michelangelo');assert.ok(l.unlockedFigures.includes('michelangelo'));
 assert.equal(startRunProfile(l,['michelangelo']).featuredFigures[0],'michelangelo');
 assert.equal(canDraw(getOpportunity('figure:michelangelo'),town(5)),false);
 let c=town(5,'river',startRunProfile(l,['michelangelo']));c.year=1520;c.funds=10000;
 assert.equal(canDraw(getOpportunity('figure:michelangelo'),c),true);
 c=selectForced(c,'figure:michelangelo');assert.equal(c.figures[0].rarity,'legend');assert.ok(modifiers(c).arts>=1.5);
 assert.equal(c.landmarks.filter(v=>v.kind==='monument').length,0);assert.equal(c.projects.filter(p=>p.kind==='monument').length,2);c=placeAwarded(c,'monument');c=placeAwarded(c,'monument');assert.equal(c.landmarks.filter(v=>v.kind==='monument').length,2);
});
test('a legendary figure cannot appear outside its broad historical era even if featured',()=>{
 let l=normalizeLegacy({...emptyLegacy(),unlockedFigures:['michelangelo']});let c=town(3,'river',startRunProfile(l,['michelangelo']));
 assert.equal(canDraw(getOpportunity('figure:michelangelo'),c),false);
 c.year=1700;assert.equal(canDraw(getOpportunity('figure:michelangelo'),c),false);
});
test('complete campaigns contain exactly twenty decisions, archives, and finite metrics',()=>{
 const c=complete(town(100));assert.equal(c.turning.choices.length,20);assert.equal(c.turning.pending,null);
 assert.ok(c.snapshots.some(s=>s.year===1850));assert.equal(c.snapshots.at(-1).year,2030);
 const s=stats(c);for(const k of ['gdp','gdpPerCapita','culturalPrestige','tourismAppeal','religiousInfluence','touristVisits'])assert.ok(Number.isFinite(s[k]),k);
 const raw=JSON.stringify(c),restored=normalizeCity(JSON.parse(raw));assert.equal(restored.turning.choices.length,20);assert.equal(restored.schema,10);
 assert.deepEqual(restored.turning.choices,c.turning.choices);
 assert.equal(advance(c,100),c);
});
test('legacy rewards are earned once per completed city and grant achievements',()=>{
 const city=complete(town(31));const reward=scoreCity(city,stats(city));assert.ok(reward.points>=100);
 const awarded=awardCompletedCity(emptyLegacy(),city,stats(city));assert.equal(awarded.points,reward.points);
 assert.equal(awarded.completed.length,1);assert.ok(awarded.achievements.includes('centuries_complete'));
 assert.deepEqual(awardCompletedCity(awarded,city,stats(city)),awarded);
});
test('importing an older saved city skips passed milestones without soft-locking',()=>{
 let c=town(11);c=normalizeCity({...c,schema:3,year:1825,turning:undefined});
 assert.ok(c.turning.skipped>0);assert.equal(c.turning.pending,null);
 c=advance(c,100);assert.ok(c.year>=1830);assert.ok(c.turning.pending);
 c=selectTurningPoint(c,c.turning.pending.options[0]);assert.equal(c.turning.choices.length,1);
});
test('multiple full campaigns remain collision-free and vary by build and geography',()=>{
 let signatures=new Set();for(const geo of ['coast','river','plain'])for(const seed of [2,19,51]){
   let c=town(seed,geo,startRunProfile(emptyLegacy(),[]));
   c=addZone(c,11,8,35,45,'res');c=addZone(c,10,54,45,10,'trade');
   c=complete(c,seed===2?'last':'first');
   const used=new Set();const roads=new Set(c.roads.filter(r=>Number.isFinite(r.x)).map(r=>`${r.x},${r.y}`));
   for(const b of c.buildings){const x=Math.floor(b.x),y=Math.floor(b.y),key=`${x},${y}`;assert.ok(!used.has(key));used.add(key);assert.equal(terrain(c.type,x,y),'land');assert.ok(!roads.has(key));}
   signatures.add(`${stats(c).population}|${stats(c).gdpPerCapita}|${c.turning.choices.map(a=>a.cardId).join('|')}`);
 }
 assert.ok(signatures.size>=7);
});
test('temporary bonuses measure expiration across figure choices, not just card choices',()=>{
 let c=town(78);c=selectForced(c,'figure:local_engineer');c=selectForced(c,'economic_miracle');
 c=selectForced(c,'figure:local_artist');assert.ok(modifiers(c).gdp>=.25);
 c=selectForced(c,'patron_arts');assert.ok(modifiers(c).gdp>=.25);
 c=selectForced(c,'figure:local_merchant');assert.equal(modifiers(c).gdp,undefined);
 c=selectForced(c,'dense_living');assert.equal(modifiers(c).gdp,undefined);
});

test('tourism district is gated behind an achievement, a Legacy purchase and choosing the card',()=>{
 let l=normalizeLegacy({...emptyLegacy(),points:2000});
 assert.equal(canBuy(l,'card','tourist_paradise').ok,false);
 assert.match(canBuy(l,'card','tourist_paradise').reason,/Cultural Rebirth/);
 l.achievements.push('cultural_rebirth');assert.equal(canBuy(l,'card','tourist_paradise').ok,true);
 l=buyLegacy(l,'card','tourist_paradise');
 let c=town(100,'plain',startRunProfile(l,[]));
 // Owning the card makes it eligible to be offered; zoning opens once it is chosen.
 assert.equal(addZone(c,10,10,8,10,'hotel'),c);
 c={...c,turning:{...c.turning,choices:[...c.turning.choices,{index:0,year:c.year,cardId:'tourist_paradise'}]}};
 const expanded=addZone(c,10,10,8,10,'hotel');assert.notEqual(expanded,c);
 assert.equal(expanded.zones.at(-1).type,'hotel');
 const noTourism=town(100,'plain',startRunProfile(emptyLegacy(),[]));
 assert.equal(addZone(noTourism,10,10,8,10,'hotel'),noTourism);
});
test('hotels physically develop on zoned land in the modern era and contribute tourism income',()=>{
 const l=normalizeLegacy({...emptyLegacy(),unlockedCards:['tourist_paradise']});
 let c=town(87,'plain',startRunProfile(l,[]));
 c={...c,turning:{...c.turning,choices:[{index:0,year:c.year,cardId:'tourist_paradise'}]}};
 c=addZone(c,12,6,40,44,'hotel');c=addZone(c,10,54,40,10,'res');
 c=complete(c);
 assert.ok(c.buildings.some(b=>b.type==='hotel'),`built ${stats(c).hotels} hotels`);
 assert.ok(stats(c).touristVisits>0);
 assert.ok(stats(c).gdpPerCapita>0);
});
test('featured historical figure has meaningful chance during their era and cannot be drawn when unaffordable',()=>{
 const profile=startRunProfile(normalizeLegacy({...emptyLegacy(),unlockedFigures:['michelangelo']}),['michelangelo']);
 let count=0;
 for(let seed=1;seed<=100;seed++){
  const c=town(seed,'river',profile);c.year=1510;c.funds=25000;
  const offered=generateOffers(c,5,0,FIGURES.map(f=>getOpportunity(`figure:${f.id}`)));
  if(offered.includes('figure:michelangelo'))count++;
 }
 assert.ok(count>=20&&count<=90,`featured legend appeared in ${count}% of opportunities`);
 const poor=town(1,'river',profile);poor.year=1510;poor.funds=15;
 assert.equal(canDraw(getOpportunity('figure:michelangelo'),poor),false);
});
test('historic survey preserves card-founded universities and artistic monuments',()=>{
 let c=town(210);
 c.year=1500;c=selectForced(c,'free_university');c=selectForced(c,'hire_artists');
 assert.equal(c.projects.length,2);c=placeAwarded(c,'university');c=placeAwarded(c,'workshop');
 const ids=c.buildings.filter(b=>b.special).map(b=>b.id);
 assert.equal(ids.length,2);
 const snapshot=captureSnapshot(c);
 const reconstructed=snapshotCity(c,snapshot);
 assert.ok(ids.every(id=>reconstructed.buildings.some(b=>b.id===id&&b.special)));
});
test('recruitment deducts only affordable treasury and expensive figures do not become free',()=>{
 let c=town(16);c.year=1900;c.funds=10000;
 const old=c.funds;
 c=selectForced(c,'figure:gaudi');assert.equal(c.funds,old-FIGURE_INDEX.gaudi.cost);
 const second={...c,funds:2};
 const blocked=selectForced(second,'figure:tesla');assert.equal(blocked.turning.choices.length,c.turning.choices.length);
 assert.equal(blocked.figures.length,c.figures.length);
});
