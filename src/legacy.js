// CIVITAS v0.5: persistent Legacy Market and historical figures.
// No payment system, in-app purchases or external data dependencies.
import {CARDS,CARD_INDEX} from './turningPoints.js';
import {POP_SCALE} from './geo.js';
import {ACHIEVEMENTS,achievementValues} from './achievements.js';
export const LOCKED_CARDS=[
 'housing_revolution','metropolitan_magnet','industrial_revolution','factory_town',
 'grand_workshops','cultural_renaissance','tourist_paradise','city_monuments',
 'great_pilgrimage','sacred_city','holy_scholars','religious_golden_age',
 'knowledge_economy','enlightenment','great_port','merchant_republic',
 'city_reinvention','monumental_ambition','charter_districts','clean_foundries','festival_calendar','public_works_academy','canal_exchange','world_exposition'
];
export const ACHIEVEMENT_REQUIREMENTS={
 tourist_paradise:{id:'cultural_rebirth',label:'Cultural Rebirth (120 cultural prestige)'},
 cultural_renaissance:{id:'cultural_rebirth',label:'Cultural Rebirth (120 cultural prestige)'},
 sacred_city:{id:'sacred_heritage',label:'Sacred Heritage (100 religious influence)'},
 knowledge_economy:{id:'knowledge_city',label:'Knowledge City (construct a university)'},
 industrial_revolution:{id:'industrial_hub',label:'Industrial Hub (25 workshops)'},
 metropolitan_magnet:{id:'population_10000',label:'10,000 residents in one city'}
};
export const BASE_CARDS=CARDS.filter(c=>!LOCKED_CARDS.includes(c.id)).map(c=>c.id);
const figure=(id,name,domain,rarity,from,to,description,effects,extra={})=>({id,name,domain,rarity,kind:'figure',minYear:from,maxYear:to,description,effects,cost:({common:0,uncommon:100,rare:220,epic:600,legend:1100}[rarity]||0),...extra});
export const FIGURES=[
 // Generic specialists are available to every civilization; names are roles, not unique people.
 figure('local_artist','Local Artist','culture','common',1300,2030,'Art production +18%; a new artistic workshop is established.',{arts:.18},{generic:true,building:'workshop'}),
 figure('local_merchant','Local Merchant','trade','common',1300,2030,'Commercial productivity +18%.',{trade:.18},{generic:true}),
 figure('local_engineer','Experienced Builder','trade','common',1300,2030,'Street access and city development +15%.',{transport:.15,development:.10},{generic:true}),
 figure('temple_scribe','Temple Scribe','religion','uncommon',1300,2030,'Religious and educational influence +20%.',{faith:.20,education:.20},{generic:true}),
 figure('master_sculptor','Master Sculptor','culture','uncommon',1300,2030,'Art production +35%; a lasting monument appears.',{arts:.35},{generic:true,building:'monument'}),
 figure('trade_envoy','Trade Envoy','trade','uncommon',1300,2030,'Commerce and migration attraction +20%.',{trade:.20,migration:.20},{generic:true}),
 figure('ibn_khaldun','Ibn Khaldun','education','rare',1300,1499,'Administration and scholarly institutions strengthen prosperity.',{education:.35,treasury:.20}),
 figure('ibn_battuta','Ibn Battuta','trade','rare',1300,1499,'Trade routes improve economic output and migration.',{trade:.45,migration:.18}),
 figure('ibn_sina','Ibn Sina','education','rare',1300,1499,'Medicine and learning make public institutions more capable.',{education:.42,services:.18}),
 figure('bach','Johann Sebastian Bach','culture','rare',1500,1749,'Music and local institutions enhance cultural prestige.',{arts:.60},{building:'monument'}),
 figure('wren','Christopher Wren','culture','rare',1500,1749,'Monumental architecture and civic rebuilding flourish.',{arts:.30,renewal:.35},{building:'monument'}),
 figure('florence_nightingale','Florence Nightingale','education','epic',1850,1949,'Public health and civic services dramatically improve.',{services:.70,prosperity:12,migration:.18}),
 figure('gaudi','Antoni Gaudí','culture','epic',1850,1949,'Visionary monuments make the city a cultural destination.',{arts:.85,heritage:.55,tourismIncome:.40},{building:'monument'}),
 figure('ada_lovelace','Ada Lovelace','education','epic',1800,1949,'Science and innovation transform future productivity.',{education:.70,innovation:.55}),
 figure('olmsted','Frederick Law Olmsted','culture','epic',1850,1949,'Public landscapes improve prosperity, heritage and civic life.',{arts:.35,services:.25,heritage:.32}),
 figure('john_rockefeller','John D. Rockefeller','industry','epic',1850,1949,'Industrial investment raises GDP but increases pollution.',{industry:.95,treasury:.35,pollution:.25}),
 figure('michelangelo','Michelangelo','culture','legend',1450,1749,'Legendary masterpieces: art production +150%, major monuments and worldwide prestige.',{arts:1.50,artsMultiplier:.50,tourismIncome:.55},{building:'double_monument',requires:'epic_artist'}),
 figure('leonardo','Leonardo da Vinci','education','legend',1450,1749,'Renaissance genius: art, engineering and education reinforce one another.',{arts:.90,education:1.0,innovation:.70},{building:'workshop'}),
 figure('brunel','Isambard Kingdom Brunel','trade','legend',1800,1949,'Engineering visionary: commerce, industry and transport combine.',{transport:.90,development:.45,industry:.55},{building:'port',geographies:['river','coast']}),
 figure('tesla','Nikola Tesla','education','legend',1850,1949,'Revolutionary innovation improves scientific and economic output.',{education:.80,innovation:1.30}),
 figure('jane_jacobs','Jane Jacobs','trade','legend',1950,2030,'Lively mixed districts make a great city more resilient and productive.',{trade:.38,services:.34,renewal:.28,prosperity:8})
];
export const FIGURE_INDEX=Object.fromEntries(FIGURES.map(f=>[f.id,f]));
export const MARKET_UPGRADES=[
 {id:'admin',name:'Skilled Administrators',domain:'education',description:'Treasury income +10% per rank.',effect:{treasury:.10},max:3,baseCost:100},
 {id:'urban',name:'Urban Planning',domain:'trade',description:'Urban growth +10% and capacity of newly built homes +6% per rank.',effect:{development:.10,newHousing:.06},max:3,baseCost:100},
 {id:'merchant',name:'Merchant Networks',domain:'trade',description:'Commercial productivity +10% per rank.',effect:{trade:.10},max:3,baseCost:110},
 {id:'patron',name:'Cultural Patronage',domain:'culture',description:'Cultural production +10% per rank.',effect:{arts:.10},max:3,baseCost:110},
 {id:'migration',name:'Migration Networks',domain:'population',description:'Migration attraction +10% and new housing capacity +3% per rank.',effect:{migration:.10,newHousing:.03},max:3,baseCost:110},
 {id:'civic',name:'Civic Institutions',domain:'religion',description:'Service efficiency +10% per rank.',effect:{services:.10},max:3,baseCost:100},
 {id:'infrastructure',name:'Enduring Infrastructure',domain:'trade',description:'Future cities begin with +8% housing capacity per rank.',effect:{legacyCapacity:.08},max:6,baseCost:150},
 {id:'innovation',name:'Accumulated Know-how',domain:'education',description:'Future cities begin with +7% productive know-how per rank.',effect:{legacyProductivity:.07},max:6,baseCost:170},
 {id:'reputation',name:'Civic Reputation',domain:'culture',description:'One additional featured historical figure slot per rank.',effect:{featuredSlots:1},max:2,baseCost:260},
 {id:'metropolis',name:'Metropolitan Charter',domain:'education',description:'Unlock the Metropolis Charter for a thriving contemporary city.',effect:{megacityCharter:1},max:1,baseCost:2200},
 {id:'luck',name:'Fortunate Encounters',domain:'wildcard',description:'Higher rarity chances in Turning Point offers.',effect:{rareLuck:.25},max:3,baseCost:150},
 {id:'rerolls',name:'Historical Insight',domain:'wildcard',description:'One extra Turning Point reroll per campaign and rank.',effect:{extraRerolls:1},max:2,baseCost:140},
 // v2.0 run upgrades: they bend a rule rather than add a percentage.
 {id:'satchel',name:'Larger Satchel',domain:'wildcard',description:'Hold one more card in your hand per rank.',effect:{handBonus:1},max:2,baseCost:160},
 {id:'council',name:'Expanded Council',domain:'education',description:'One more Decree slot in every city.',effect:{decreeBonus:1},max:1,baseCost:420},
 {id:'favours',name:'Market Favours',domain:'trade',description:'The first Market Hall reroll of each decade is free.',effect:{freeRerolls:1},max:1,baseCost:220},
 {id:'vault',name:'Reliquary Vault',domain:'culture',description:'Carry one more artifact into each city per rank.',effect:{artifactSlots:1},max:2,baseCost:260}
];
// v2.0 Founders: who founds the town. Each brings two starting cards and makes
// their doctrine three times as likely in the Market Hall. Three are open from
// the first run; the others join once you reach tier 1 of their doctrine in a
// run, or for LP.
export const FOUNDERS=[
 {id:'wanderer',name:'The Wanderer',doctrine:null,description:'No allegiance and a fuller purse: the treasury starts 15% larger.',cards:[],startFunds:1.15,free:true},
 {id:'abbess',name:'The Abbess',doctrine:'faith',description:'Founds the town around a chapel and its tithe barn.',cards:['b_chapel','tithe_barn'],free:true},
 {id:'merchant',name:'The Merchant Prince',doctrine:'trade',description:'Opens a market and a toll on the bridge.',cards:['b_market','toll_bridge'],free:true},
 {id:'millwright',name:'The Millwright',doctrine:'industry',description:'Brings a water mill and master craftsmen.',cards:['water_mill','master_craftsmen'],cost:120},
 {id:'painter',name:'The Painter',doctrine:'arts',description:'Brings a painters’ guild and a wealthy patron.',cards:['painters_guild','patron_arts'],cost:120},
 {id:'scholar',name:'The Scholar',doctrine:'learning',description:'Brings an almanac and a circle of scholars.',cards:['almanac','great_scholars'],cost:120},
 {id:'reeve',name:'The Reeve',doctrine:'people',description:'Builds a granary and welcomes large families.',cards:['b_granary','fertile_families'],cost:120}
];
export const FOUNDER_INDEX=Object.fromEntries(FOUNDERS.map(f=>[f.id,f]));
// v2.0 Artifacts: bought once with LP, then carried into a city (1 slot, +1 per
// Reliquary Vault rank). Each bends one rule for that run.
export const ARTIFACTS=[
 {id:'charter',name:'Founding Charter',description:'The treasury starts 10% larger.',perks:{startFunds:1.1},cost:120},
 {id:'chain',name:'Surveyor’s Chain',description:'The first Market Hall reroll of each decade is free.',perks:{freeRerolls:1},cost:150},
 {id:'scales',name:'Merchant’s Scales',description:'Market Hall prices −10%.',perks:{priceMult:.9},cost:180},
 {id:'vane',name:'Weather Vane',description:'History is announced 3 years earlier.',perks:{omenLeadBonus:3},cost:140},
 {id:'concord',name:'Seal of Concord',description:'Unrest builds 35% more slowly.',perks:{unrestMult:.65},cost:160},
 {id:'bell',name:'Commune Bell',description:'One more Decree slot.',perks:{decreeBonus:1},cost:240},
 {id:'astrolabe',name:'Brass Astrolabe',description:'Every era draft offers one more card.',perks:{draftBonus:1},cost:220},
 {id:'reliquary',name:'Founder’s Reliquary',description:'The first Market Hall offers one more card, an Uncommon.',perks:{startUncommon:1},cost:170}
];
export const ARTIFACT_INDEX=Object.fromEntries(ARTIFACTS.map(a=>[a.id,a]));
// v2.0 Boosters: consumed when you found a city (up to two per city). They add
// cards to the first Market Hall, at the usual price.
export const BOOSTERS=[
 {id:'bundle',name:'Doctrine Bundle',description:'The first Market Hall offers two more cards of your Founder’s doctrine (any one doctrine for the Wanderer).',cost:60},
 {id:'sealed',name:'Sealed Rare',description:'The first Market Hall offers one more card, a Rare from your pool.',cost:140},
 {id:'purse',name:'Guild Purse',description:'The treasury starts 10% larger.',cost:50}
];
export const BOOSTER_INDEX=Object.fromEntries(BOOSTERS.map(b=>[b.id,b]));
export const BOOSTERS_PER_CITY=2,MAX_HARDSHIP=10,RUNS_KEPT=60;
export const UPGRADE_INDEX=Object.fromEntries(MARKET_UPGRADES.map(u=>[u.id,u]));
export function legacyInvestmentProgress(legacy){const l=normalizeLegacy(legacy),bonuses=runModifiersFromLegacy(l),ranks=Object.values(l.upgrades).reduce((sum,n)=>sum+n,0),round=n=>Math.round(n*10000)/10000;return {ranks,capacity:round(bonuses.legacyCapacity||0),productivity:round(bonuses.legacyProductivity||0),featuredSlots:5+(bonuses.featuredSlots||0),megacity:!!bonuses.megacityCharter};}
export function emptyLegacy(){return {version:4,points:0,unlockedCards:[],unlockedFigures:[],upgrades:{},completed:[],achievements:[],claimedAchievements:[],lifetimePoints:0,packs:{opened:0,sinceEpic:0,sinceLegend:0},
 // v2.0 runs and meta: best doctrine tier ever reached, owned founders/artifacts, boosters in stock, highest Hardship open, past runs.
 mastery:{},founders:[],artifacts:[],boosters:{},hardship:0,runs:[]};}
export function normalizeLegacy(raw){const base=emptyLegacy();if(!raw||typeof raw!=='object')return base;
 const strings=v=>Array.isArray(v)?Array.from(new Set(v.filter(x=>typeof x==='string'))):[];
 const count=v=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):0;
 const achievements=strings(raw.achievements);if(achievements.includes('pop_10k')&&!achievements.includes('population_10000'))achievements.push('population_10000');
 return {...base,points:count(raw.points),unlockedCards:strings(raw.unlockedCards).filter(k=>LOCKED_CARDS.includes(k)),unlockedFigures:strings(raw.unlockedFigures).filter(k=>FIGURE_INDEX[k]&&!FIGURE_INDEX[k].generic),upgrades:Object.fromEntries(Object.entries(raw.upgrades||{}).filter(([k,v])=>UPGRADE_INDEX[k]&&Number.isInteger(v)&&v>=0).map(([k,v])=>[k,Math.min(v,UPGRADE_INDEX[k].max)])),completed:strings(raw.completed),achievements,claimedAchievements:strings(raw.claimedAchievements),lifetimePoints:count(raw.lifetimePoints),packs:{opened:count(raw.packs?.opened),sinceEpic:Math.min(4,count(raw.packs?.sinceEpic)),sinceLegend:Math.min(11,count(raw.packs?.sinceLegend))},
  mastery:Object.fromEntries(Object.entries(raw.mastery||{}).filter(([k,v])=>typeof k==='string'&&Number.isFinite(Number(v))).map(([k,v])=>[k,Math.max(0,Math.min(4,Math.floor(Number(v))))])),
  founders:strings(raw.founders).filter(k=>FOUNDER_INDEX[k]),artifacts:strings(raw.artifacts).filter(k=>ARTIFACT_INDEX[k]),
  boosters:Object.fromEntries(Object.entries(raw.boosters||{}).filter(([k])=>BOOSTER_INDEX[k]).map(([k,v])=>[k,Math.min(99,count(v))])),
  hardship:Math.min(MAX_HARDSHIP,count(raw.hardship)),
  runs:(Array.isArray(raw.runs)?raw.runs:[]).filter(r=>r&&typeof r.id==='string'&&Number.isFinite(r.score)).slice(-RUNS_KEPT)};
}
// v2.0: a founder is open if free, bought, or their doctrine reached tier 1 in a run.
export function founderOpen(legacy,id){const f=FOUNDER_INDEX[id];if(!f)return false;return !!f.free||(legacy.founders||[]).includes(id)||(!!f.doctrine&&(legacy.mastery?.[f.doctrine]||0)>=1);}
export function artifactSlots(legacy){return 1+((legacy.upgrades||{}).vault||0);}
export function marketCost(type,id,rank=0){if(type==='founder')return FOUNDER_INDEX[id]?.cost??Infinity;if(type==='artifact')return ARTIFACT_INDEX[id]?.cost??Infinity;if(type==='booster')return BOOSTER_INDEX[id]?.cost??Infinity;
 if(type==='card'){const c=CARD_INDEX[id];return c?({common:85,uncommon:115,rare:175,epic:260,legend:600}[c.rarity]||200):Infinity;}
 if(type==='pack')return FIGURE_PACKS.find(p=>p.id===id)?.cost??Infinity;
 if(type==='figure')return Infinity;
 const u=UPGRADE_INDEX[id];return u?Math.round(u.baseCost*(1+rank*.8)):Infinity;}
export function canBuy(legacy,type,id){const l=normalizeLegacy(legacy);let cost=Infinity,reason='Unknown item';
 if(type==='card'){if(!LOCKED_CARDS.includes(id))return {ok:false,reason:'Already available from the start'};if(l.unlockedCards.includes(id))return {ok:false,reason:'Already unlocked'};const achievement=ACHIEVEMENT_REQUIREMENTS[id];if(achievement&&!l.achievements.includes(achievement.id))return {ok:false,reason:`Requires ${achievement.label}`};cost=marketCost('card',id);reason='Not enough Legacy Points';}
 else if(type==='figure')return {ok:false,reason:'Discover historical figures in packs'};
 else if(type==='founder'){const f=FOUNDER_INDEX[id];if(!f)return {ok:false,reason:'Unknown founder'};if(founderOpen(l,id))return {ok:false,reason:'Already in your council'};cost=f.cost;reason='Not enough Legacy Points';}
 else if(type==='artifact'){if(!ARTIFACT_INDEX[id])return {ok:false,reason:'Unknown artifact'};if(l.artifacts.includes(id))return {ok:false,reason:'Already owned'};cost=marketCost(type,id);reason='Not enough Legacy Points';}
 else if(type==='booster'){if(!BOOSTER_INDEX[id])return {ok:false,reason:'Unknown booster'};if((l.boosters[id]||0)>=99)return {ok:false,reason:'Storeroom full'};cost=marketCost(type,id);reason='Not enough Legacy Points';}
 else if(type==='pack'){cost=marketCost(type,id);if(!Number.isFinite(cost))return {ok:false,reason:'Unknown pack'};if(!figurePackOdds(l,id).length)return {ok:false,reason:'Collection complete'};reason='Not enough Legacy Points';}
 else if(type==='upgrade'){const u=UPGRADE_INDEX[id];if(!u)return {ok:false,reason:'Unknown upgrade'};const rank=l.upgrades[id]||0;if(rank>=u.max)return {ok:false,reason:'Maximum rank reached'};cost=marketCost('upgrade',id,rank);reason='Not enough Legacy Points';}
 return {ok:l.points>=cost,cost,reason:l.points>=cost?'Available to purchase':reason};
}
export function buyLegacy(legacy,type,id){const l=normalizeLegacy(legacy),check=canBuy(l,type,id);if(!check.ok)return l;
 if(type==='pack')return l; // Random purchases use openFigurePack exactly once per action.
 const next={...l,points:l.points-check.cost,unlockedCards:[...l.unlockedCards],unlockedFigures:[...l.unlockedFigures],upgrades:{...l.upgrades}};
 if(type==='card')next.unlockedCards.push(id);else if(type==='figure')next.unlockedFigures.push(id);
 else if(type==='founder')next.founders=[...l.founders,id];else if(type==='artifact')next.artifacts=[...l.artifacts,id];
 else if(type==='booster')next.boosters={...l.boosters,[id]:(l.boosters[id]||0)+1};
 else next.upgrades[id]=(next.upgrades[id]||0)+1;
 return next;
}

export const FIGURE_PACKS=[
 {id:'discovery',name:'Discovery folio',cost:100,description:'One random historical figure. A small beginning for your collection.',weights:{rare:70,epic:25,legend:5}},
 {id:'patron',name:'Patron folio',cost:240,description:'One random figure, with stronger Epic and Legendary odds.',weights:{rare:40,epic:45,legend:15}},
 {id:'grand',name:'Grand folio',cost:450,description:'One Epic or Legendary figure. A commission for an ambitious patron.',weights:{rare:0,epic:65,legend:35}}
];
const RARITY_ORDER=['rare','epic','legend'];
export function figurePackOdds(legacy,packId){
 const l=normalizeLegacy(legacy),pack=FIGURE_PACKS.find(p=>p.id===packId);if(!pack)return [];
 const available=FIGURES.filter(f=>!f.generic&&!l.unlockedFigures.includes(f.id));if(!available.length)return [];
 if(packId==='grand'&&!available.some(f=>f.rarity==='epic'||f.rarity==='legend'))return [];
 let minimum=l.packs.sinceLegend>=11?2:l.packs.sinceEpic>=4?1:0;
 // A completed rarity tier promotes its chance to the next remaining tier.
 // Guarantees stop counting once that entire tier has been discovered.
 if(!available.some(f=>RARITY_ORDER.indexOf(f.rarity)>=minimum))minimum=0;
 const weights={};
 for(const [rarity,weight] of Object.entries(pack.weights)){
  if(!weight)continue;
  const start=Math.max(minimum,RARITY_ORDER.indexOf(rarity));
  let tier=RARITY_ORDER.slice(start).find(r=>available.some(f=>f.rarity===r));
  if(!tier)tier=[...RARITY_ORDER].reverse().find(r=>available.some(f=>f.rarity===r));
  weights[tier]=(weights[tier]||0)+weight;
 }
 const total=Object.values(weights).reduce((a,b)=>a+b,0);
 return RARITY_ORDER.filter(r=>weights[r]>0).map(rarity=>({rarity,chance:weights[rarity]/total,figures:available.filter(f=>f.rarity===rarity)}));
}
export function openFigurePack(legacy,packId,random=Math.random){
 const l=normalizeLegacy(legacy),check=canBuy(l,'pack',packId);if(!check.ok)return {legacy:l,figure:null,error:check.reason};
 const odds=figurePackOdds(l,packId),roll=()=>Math.min(.999999999,Math.max(0,Number(random())||0));
 let target=roll(),tier=odds.at(-1);for(const row of odds){target-=row.chance;if(target<0){tier=row;break;}}
 const figure=tier.figures[Math.floor(roll()*tier.figures.length)];
 const packs={opened:l.packs.opened+1,sinceEpic:figure.rarity==='rare'?Math.min(4,l.packs.sinceEpic+1):0,sinceLegend:figure.rarity==='legend'?0:Math.min(11,l.packs.sinceLegend+1)};
 return {legacy:{...l,points:l.points-check.cost,unlockedFigures:[...l.unlockedFigures,figure.id],packs},figure,error:null};
}

export function awardCityMilestones(legacy,city,current){
 const l=normalizeLegacy(legacy),values=achievementValues(city,current),claimed=new Set(l.claimedAchievements),unlocked=new Set(l.achievements);
 let points=0;
 for(const a of ACHIEVEMENTS)if(unlocked.has(a.id)||(values[a.metric]||0)>=a.target){unlocked.add(a.id);if(!claimed.has(a.id)){claimed.add(a.id);points+=a.points;}}
 return {...l,points:l.points+points,lifetimePoints:l.lifetimePoints+points,achievements:[...unlocked],claimedAchievements:[...claimed]};
}
export function runModifiersFromLegacy(l){const result={};for(const u of MARKET_UPGRADES){const rank=l.upgrades[u.id]||0;for(const [k,v] of Object.entries(u.effect))result[k]=(result[k]||0)+v*rank;}return result;}
export function startRunProfile(legacy,loadout){const l=normalizeLegacy(legacy);
 const progression=legacyInvestmentProgress(l),selected=Array.from(new Set((loadout||[]).filter(id=>l.unlockedFigures.includes(id)))).slice(0,progression.featuredSlots);
 return {cardPool:[...BASE_CARDS,...l.unlockedCards],figurePool:[...l.unlockedFigures],featuredFigures:selected,progression,legacyBonuses:runModifiersFromLegacy(l)};
}
export function scoreCity(city,stats){
 // Reward scale, prosperity, and specializations. High population keeps earning
 // meaningful Legacy Points above the old ~17,500-person saturation point.
 const populationScore=Math.min(325,Math.sqrt(Math.max(0,stats.population)/POP_SCALE)*1.45);
 const economicScore=Math.min(100,Math.max(0,stats.gdpPerCapita)/1300);
 const qualityScore=Math.max(0,Math.min(60,(stats.prosperity-35)*1.1));
 const points=Math.round(75+populationScore+economicScore+qualityScore+
   Math.min(75,stats.culturalPrestige*.10)+Math.min(70,stats.religiousInfluence*.14)+Math.min(70,stats.educationIndex*.16));
 const values=achievementValues(city,stats),achievements=ACHIEVEMENTS.filter(a=>(values[a.metric]||0)>=a.target).map(a=>a.id);
 if(city.year>=2030)achievements.push('centuries_complete');
 return {points,achievements};
}
export function awardCompletedCity(legacy,city,stats){const l=normalizeLegacy(legacy);if(!city.finished||l.completed.includes(city.id))return l;
 const reward=scoreCity(city,stats);return {...l,points:l.points+reward.points,lifetimePoints:l.lifetimePoints+reward.points,completed:[...l.completed,city.id],achievements:Array.from(new Set([...l.achievements,...reward.achievements]))};
}
