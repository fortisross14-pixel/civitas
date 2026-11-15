// CIVITAS v2.1 — what a card does, in plain numbers.
// effectLines(card, city): the card's effects as signed lines ("+12% Faith").
// previewImpact(city, card): the city before and after playing it (the same
// stats the game uses), so a card shows its real consequence, not a promise.
import {CARD_INDEX,eraEffects,turningMode} from './turningPoints.js';
import {BUILDING_EFFECTS,BASIC_INDEX,SPECIAL_BUILDINGS} from './construction.js';
import {NEEDS} from './needs.js';
import {stats} from './sim.js';
import {URBAN_WORKS} from './urbanWorks.js';
import {annualRevenue} from './economy.js';

export const EFFECT_LABELS={
  faith:'Faith output',industry:'Industry output',trade:'Commerce',arts:'Culture',education:'Learning',
  migration:'Settlers arriving',housing:'Housing capacity',births:'Births',prosperity:'Prosperity',treasury:'Treasury income',
  innovation:'Innovation',services:'Public services',pollution:'Smoke',heritage:'Heritage',tourismIncome:'Tourism income',
  transport:'Transport',development:'Town growth',popInstant:'Residents at once',gdp:'Economic output',renewal:'Renewal',
  pilgrimage:'Pilgrims',crowding:'Crowding',artsMultiplier:'Culture multiplier',newHousing:'New homes’ size',
  migrationPerLandmark:'Settlers per landmark',industrialDevelopment:'Industrial growth',industrialMultiplier:'Industry multiplier',
  industryPerThousand:'Industry per 1,000 residents',tourismPerMonument:'Tourism per monument',faithEducation:'Learning from faith',
  faithMigration:'Settlers drawn by faith',faithMultiplier:'Faith multiplier',universityProductivity:'Output per university',
  knowledgePerUniversity:'Learning per university',merchantMigration:'Settlers drawn by trade'
};
// Points, not percentages.
const POINT_KEYS=new Set(['prosperity','crowding']);
// Smoke and crowding are bad when they rise.
const BAD_WHEN_UP=new Set(['pollution','crowding']);

export function formatEffect(key,value){
  const label=EFFECT_LABELS[key]||key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
  // Under 1%, one decimal, so small effects still show.
  const pct=value*100,v=POINT_KEYS.has(key)?Math.round(value*10)/10:Math.abs(pct)<1?Math.round(pct*10)/10:Math.round(pct);
  if(!v)return null;
  const good=BAD_WHEN_UP.has(key)?v<0:v>0;
  return {key,label,text:`${v>0?'+':'−'}${Math.abs(v)}${POINT_KEYS.has(key)?'':'%'}`,good};
}
function linesFor(effects){return Object.entries(effects||{}).filter(([k,v])=>typeof v==='number'&&!['masterpieces'].includes(k)).map(([k,v])=>formatEffect(k,v)).filter(Boolean).sort((a,b)=>(b.good-a.good));}

// Which needs a building answers (for building cards).
export function needsAnswered(kind,year){
  return Object.entries(NEEDS).filter(([,n])=>n.answers(year).includes(kind)).map(([id,n])=>n.label||id);
}
// What a card does: effects (scaled as the game applies them), its building,
// duration and the needs it answers.
export function cardSummary(card,city=null){
  if(!card)return {lines:[],building:null,duration:null,needs:[]};
  const era=city?turningMode(city)==='era':true;
  const kind=card.building&&card.kind!=='figure'?card.building:null;
  const def=kind?(BASIC_INDEX[kind]||SPECIAL_BUILDINGS[kind]):null;
  const effects=card.kind==='figure'?card.effects:era?eraEffects(card):card.effects;
  // The card's own effects and its building's, merged key by key.
  const merged={...(effects||{})};if(kind&&BUILDING_EFFECTS[kind])for(const [k,v] of Object.entries(BUILDING_EFFECTS[kind]))merged[k]=(merged[k]||0)+v;
  const lines=linesFor(merged);
  const duration=card.durationPoints?`for ${card.durationPoints*25} years`:card.kind==='figure'?'while they live':kind?'once placed, for good':'for the rest of the run';
  const urban=card.urban?URBAN_WORKS[card.urban]?.label:null;
  return {lines,building:def?{kind,name:def.name||card.name}:kind?{kind,name:card.name}:urban?{kind:'urban',name:urban,urban:true}:null,duration:urban?'for good: streets stay':duration,needs:kind?needsAnswered(kind,city?.year??1300):[]};
}

// What changes the moment this card is played: every city figure that moves,
// in the game's own numbers. Many cards act on growth rates instead (births,
// settlers, productivity): those show no change now and say so.
const NOW_METRICS=[['prosperity','Prosperity',0],['capacity','Housing for',0],['population','Residents',0],['religiousInfluence','Faith influence',0],
  ['culturalPrestige','Cultural prestige',0],['educationIndex','Learning',0],['gdpPerCapita','Output per person',0],['infrastructureEfficiency','Infrastructure',0],
  ['tourismAppeal','Tourism appeal',0],['pollution','Smoke',1],['jobs','Jobs',0],['unemployment','Unemployment %',1]];
export function previewImpact(city,card){
  if(!city||!card||card.kind==='figure'||card.building||card.urban||city.awaitingCenter)return null;
  const choices=city.turning?.choices||[];
  const trial={...city,turning:{...city.turning,choices:[...choices,{index:-1,year:city.year,cardId:card.id,via:'hand'}]}};
  const before=stats(city),after=stats(trial),fmt=v=>Math.round(v).toLocaleString('en-US');
  const rows=NOW_METRICS.map(([k,label,bad])=>({label,before:fmt(before[k]||0),after:fmt(after[k]||0),d:(after[k]||0)-(before[k]||0),bad})).filter(r=>Math.abs(r.d)>=.5).map(r=>({label:r.label,before:r.before,after:r.after,good:r.bad?r.d<0:r.d>0}));
  const ib=annualRevenue(city,before).total,ia=annualRevenue(trial,after).total;
  if(Math.abs(ia-ib)>=1)rows.push({label:'Income / year',before:fmt(ib),after:fmt(ia),good:ia>ib});
  const pop=card.effects?.popInstant?Math.round((city.residents||0)*eraEffects(card).popInstant):0;
  if(pop)rows.unshift({label:'Residents at once',before:fmt(before.population),after:fmt(before.population+pop),good:pop>0});
  return {rows,slow:!rows.length};
}
export const cardById=id=>CARD_INDEX[id];

