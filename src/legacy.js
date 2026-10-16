// CIVITAS v0.5: persistent Legacy Market and historical figures.
// No payment system, in-app purchases or external data dependencies.
import {CARDS,CARD_INDEX} from './turningPoints.js';
import {POP_SCALE} from './geo.js';
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
 metropolitan_magnet:{id:'pop_10k',label:'Growing Metropolis (120,000 population)'}
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
 {id:'rerolls',name:'Historical Insight',domain:'wildcard',description:'One extra Turning Point reroll per campaign and rank.',effect:{extraRerolls:1},max:2,baseCost:140}
];
export const UPGRADE_INDEX=Object.fromEntries(MARKET_UPGRADES.map(u=>[u.id,u]));
export function legacyInvestmentProgress(legacy){const l=normalizeLegacy(legacy),bonuses=runModifiersFromLegacy(l),ranks=Object.values(l.upgrades).reduce((sum,n)=>sum+n,0),round=n=>Math.round(n*10000)/10000;return {ranks,capacity:round(bonuses.legacyCapacity||0),productivity:round(bonuses.legacyProductivity||0),featuredSlots:5+(bonuses.featuredSlots||0),megacity:!!bonuses.megacityCharter};}
export function emptyLegacy(){return {version:2,points:0,unlockedCards:[],unlockedFigures:[],upgrades:{},completed:[],achievements:[],lifetimePoints:0};}
export function normalizeLegacy(raw){const base=emptyLegacy();if(!raw||typeof raw!=='object')return base;
 return {...base,points:Math.max(0,Math.floor(Number(raw.points)||0)),unlockedCards:Array.from(new Set((raw.unlockedCards||[]).filter(k=>LOCKED_CARDS.includes(k)))),unlockedFigures:Array.from(new Set((raw.unlockedFigures||[]).filter(k=>FIGURE_INDEX[k]&&!FIGURE_INDEX[k].generic))),upgrades:Object.fromEntries(Object.entries(raw.upgrades||{}).filter(([k,v])=>UPGRADE_INDEX[k]&&Number.isInteger(v)&&v>=0).map(([k,v])=>[k,Math.min(v,UPGRADE_INDEX[k].max)])),completed:Array.from(new Set((raw.completed||[]).filter(x=>typeof x==='string'))),achievements:Array.from(new Set((raw.achievements||[]).filter(x=>typeof x==='string'))),lifetimePoints:Math.max(0,Math.floor(Number(raw.lifetimePoints)||0))};
}
export function marketCost(type,id,rank=0){if(type==='card'){const c=CARD_INDEX[id];return c?({common:85,uncommon:115,rare:175,epic:260,legend:600}[c.rarity]||200):Infinity;}
 if(type==='figure'){const f=FIGURE_INDEX[id];return f?({rare:220,epic:440,legend:850}[f.rarity]||Infinity):Infinity;}
 const u=UPGRADE_INDEX[id];return u?Math.round(u.baseCost*(1+rank*.8)):Infinity;}
export function canBuy(legacy,type,id){const l=normalizeLegacy(legacy);let cost=Infinity,reason='Unknown item';
 if(type==='card'){if(!LOCKED_CARDS.includes(id))return {ok:false,reason:'Already available from the start'};if(l.unlockedCards.includes(id))return {ok:false,reason:'Already unlocked'};const achievement=ACHIEVEMENT_REQUIREMENTS[id];if(achievement&&!l.achievements.includes(achievement.id))return {ok:false,reason:`Requires ${achievement.label}`};cost=marketCost('card',id);reason='Not enough Legacy Points';}
 else if(type==='figure'){const f=FIGURE_INDEX[id];if(!f||f.generic)return {ok:false,reason:'Unavailable figure'};if(l.unlockedFigures.includes(id))return {ok:false,reason:'Already unlocked'};
  if(f.rarity==='legend'&&!l.achievements.includes('epic_patron'))return {ok:false,reason:'Requires Epic Patron achievement: recruit an Epic person in a completed city'};
  cost=marketCost('figure',id);reason='Not enough Legacy Points';
 }else if(type==='upgrade'){const u=UPGRADE_INDEX[id];if(!u)return {ok:false,reason:'Unknown upgrade'};const rank=l.upgrades[id]||0;if(rank>=u.max)return {ok:false,reason:'Maximum rank reached'};cost=marketCost('upgrade',id,rank);reason='Not enough Legacy Points';}
 return {ok:l.points>=cost,cost,reason:l.points>=cost?'Available to purchase':reason};
}
export function buyLegacy(legacy,type,id){const l=normalizeLegacy(legacy),check=canBuy(l,type,id);if(!check.ok)return l;
 const next={...l,points:l.points-check.cost,unlockedCards:[...l.unlockedCards],unlockedFigures:[...l.unlockedFigures],upgrades:{...l.upgrades}};
 if(type==='card')next.unlockedCards.push(id);else if(type==='figure')next.unlockedFigures.push(id);else next.upgrades[id]=(next.upgrades[id]||0)+1;
 return next;
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
 const achievements=[];
 if(city.year>=2030)achievements.push('centuries_complete');
 if(stats.population>=10000*POP_SCALE)achievements.push('pop_10k');
 if(stats.population>=50000*POP_SCALE)achievements.push('pop_50k');
 if(stats.culturalPrestige>=120)achievements.push('cultural_rebirth');
 if(stats.religiousInfluence>=100)achievements.push('sacred_heritage');
 if(stats.universities>=1)achievements.push('knowledge_city');
 if(stats.industry>=25)achievements.push('industrial_hub');
 if((city.landmarks||[]).some(v=>v.kind==='port'))achievements.push('maritime_trade');
 if((city.figures||[]).some(v=>FIGURE_INDEX[v.id]?.rarity==='epic'))achievements.push('epic_patron');
 if((city.figures||[]).some(v=>FIGURE_INDEX[v.id]?.rarity==='legend'))achievements.push('legendary_founder');
 return {points,achievements};
}
export function awardCompletedCity(legacy,city,stats){const l=normalizeLegacy(legacy);if(!city.finished||l.completed.includes(city.id))return l;
 const reward=scoreCity(city,stats);return {...l,points:l.points+reward.points,lifetimePoints:l.lifetimePoints+reward.points,completed:[...l.completed,city.id],achievements:Array.from(new Set([...l.achievements,...reward.achievements]))};
}
