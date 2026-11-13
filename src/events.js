// CIVITAS v1.4 — historical events. Roughly once a generation history knocks on
// the city gate: a plague, a revolt, a new idea, a disaster. Each event pauses
// the clock and offers two or three responses. A response may change residents
// or treasury at once and applies timed modifiers (same keys as cards and
// policies) for a number of years. Events are era-bound, seen once per city,
// and carry a map position so the story is written onto the map.
import {rand,hash,POP_SCALE as K} from './geo.js';
import {doctrineFlags} from './doctrines.js';

const WATER=['river','coast','estuary','lake'];
// near: which buildings anchor the caption on the map.
export const EVENTS=[
  {id:'black_death',from:1340,to:1365,near:'res',title:'The Great Mortality',
   text:'A pestilence arrives with the ships and carts. Whole streets fall silent.',
   choices:[
     {label:'Close the gates',detail:'Quarantine the town: fewer deaths, but trade stalls for a decade.',residents:-.12,funds:-.1,effects:{trade:-.12},years:10},
     {label:'Keep the markets open',detail:'Commerce carries on, and so does the plague.',residents:-.24,effects:{trade:.04},years:10}]},
  {id:'guild_revolt',from:1370,to:1480,near:'craft',title:'The Weavers Rise',
   text:'Craftsmen march on the town hall demanding seats on the council.',
   choices:[
     {label:'Grant guild seats',detail:'Industry +8% for 30 years, a calmer town.',effects:{industry:.08,prosperity:1},years:30},
     {label:'Hang the ringleaders',detail:'Order is kept. Resentment lingers: prosperity −3 for 20 years.',funds:-.05,effects:{prosperity:-3,industry:.02},years:20}]},
  {id:'relic',from:1380,to:1500,near:'civic',title:'A Holy Relic',
   text:'A merchant returns from the east with the bones of a saint.',
   choices:[
     {label:'Enshrine it',detail:'Pilgrims flock in: faith +15% and migration +5% for 40 years.',funds:-.08,effects:{faith:.15,migration:.05,pilgrimage:.1},years:40},
     {label:'Sell it to the bishop',detail:'A windfall for the treasury.',funds:.25}]},
  {id:'printing',from:1460,to:1540,near:'trade',title:'The Printing Press',
   text:'A printer asks leave to set up his press near the market.',
   choices:[
     {label:'License the printers',detail:'Education +12% and innovation +6% for 50 years; the clergy frown.',effects:{education:.12,innovation:.06,faith:-.05},years:50},
     {label:'Ban unlicensed books',detail:'Faith +8% for 30 years.',effects:{faith:.08},years:30}]},
  {id:'iconoclasm',from:1520,to:1600,near:'civic',title:'The Iconoclastic Fury',
   text:'Crowds of Protestants smash statues and paintings in the churches.',
   choices:[
     {label:'Tolerate the reformers',detail:'Migration +12% and commerce +5% for 40 years; faith −12%.',effects:{migration:.12,trade:.05,faith:-.12},years:40},
     {label:'Send in the militia',detail:'The old faith holds (+10%), but dissenters leave.',funds:-.06,residents:-.04,effects:{faith:.10,migration:-.08},years:30}]},
  {id:'refugees',from:1560,to:1700,near:'trade',title:'Merchants in Exile',
   text:'Refugee merchant families from a sacked city ask to settle here with their fortunes.',
   choices:[
     {label:'Welcome them',detail:'+6% residents now, commerce +10% for 40 years; housing grows tight.',residents:.06,effects:{trade:.10,housing:-.04},years:40},
     {label:'Turn them away',detail:'Nothing changes.'}]},
  {id:'mania',from:1610,to:1720,near:'trade',title:'A Speculative Mania',
   text:'Burghers trade bulbs and shares for the price of a canal house.',
   choices:[
     {label:'Tax the frenzy',detail:'A treasury windfall now; the crash costs prosperity −4 for 12 years.',funds:.3,effects:{prosperity:-4},years:12},
     {label:'Forbid the trade',detail:'Prudence: prosperity +1 for 20 years.',effects:{prosperity:1},years:20}]},
  {id:'drainage',from:1550,to:1800,near:'farm',water:true,title:'Draining the Marsh',
   text:'Engineers offer to pump the wetlands dry with a line of windmills.',
   choices:[
     {label:'Fund the polder',detail:'Costly, but farms and housing grow: housing +8%, migration +5% for 50 years.',funds:-.3,effects:{housing:.08,migration:.05},years:50},
     {label:'Leave the marsh',detail:'Keep the money.'}]},
  {id:'academy',from:1680,to:1790,near:'civic',title:'A Learned Society',
   text:'Physicians and astronomers petition for a charter and a meeting hall.',
   choices:[
     {label:'Grant a charter',detail:'Education +15% and innovation +10% for 50 years.',funds:-.15,effects:{education:.15,innovation:.10},years:50},
     {label:'Decline politely',detail:'The scholars move to a rival city: innovation −3%.',effects:{innovation:-.03},years:30}]},
  {id:'revolution',from:1785,to:1830,near:'civic',title:'Liberty, Equality…',
   text:'Revolutionary pamphlets fill the coffee houses; a crowd plants a liberty tree in the square.',
   choices:[
     {label:'Reform the council',detail:'Prosperity +3, migration +6% for 30 years; old privileges end (faith −8%).',effects:{prosperity:3,migration:.06,faith:-.08},years:30},
     {label:'Restore order',detail:'Garrison costs and prosperity −2 for 20 years.',funds:-.1,effects:{prosperity:-2},years:20}]},
  {id:'railway',from:1835,to:1885,near:'craft',title:'The Railway Company',
   text:'A railway company asks for land to bring the line into the city.',
   choices:[
     {label:'Grant the land',detail:'Transport +12%, industry +8% for 50 years; smoke follows.',effects:{transport:.12,industry:.08,pollution:.1},years:50},
     {label:'Keep it outside the walls',detail:'Heritage +8% for 50 years, slower growth.',effects:{heritage:.08,development:-.05},years:50}]},
  {id:'cholera',from:1830,to:1900,near:'res',title:'Cholera in the Courts',
   text:'Cholera spreads from the wells of the crowded courts.',
   choices:[
     {label:'Build sewers and waterworks',detail:'Expensive. Services +15% and prosperity +3 for 60 years.',funds:-.35,residents:-.02,effects:{services:.15,prosperity:3},years:60},
     {label:'Pray and wait',detail:'Many die.',residents:-.08,effects:{prosperity:-2},years:15}]},
  {id:'strike',from:1880,to:1925,near:'craft',title:'The General Strike',
   text:'Dockers and factory hands down tools across the city.',
   choices:[
     {label:'Concede the eight-hour day',detail:'Prosperity +4, industry −5% for 30 years.',effects:{prosperity:4,industry:-.05},years:30},
     {label:'Break the strike',detail:'Industry +5%, prosperity −4 for 25 years.',effects:{industry:.05,prosperity:-4},years:25}]},
  {id:'war',from:1914,to:1945,near:'res',title:'War Comes to the City',
   text:'Bombers are reported over the coast. The council must prepare.',
   choices:[
     {label:'Shelters and evacuation',detail:'Costly, but residents are spared.',funds:-.25,residents:-.03},
     {label:'Business as usual',detail:'Industry +6% for war orders; heavier losses.',residents:-.09,effects:{industry:.06},years:10}]},
  {id:'motorway',from:1955,to:1980,near:'res',title:'The Motorway Plan',
   text:'Planners propose an urban motorway cutting through the old quarters.',
   choices:[
     {label:'Build it',detail:'Transport +15% for 50 years; heritage −12% and noise.',effects:{transport:.15,heritage:-.12,prosperity:-1},years:50},
     {label:'Save the old town',detail:'Heritage +12% and tourism for 50 years.',effects:{heritage:.12,tourismIncome:.08},years:50}]},
  {id:'squatters',from:1965,to:1995,near:'res',title:'Squatters and Provos',
   text:'Young people occupy empty warehouses and paint the bicycles white.',
   choices:[
     {label:'Let the counterculture bloom',detail:'Arts +15% for 30 years; property owners grumble.',effects:{arts:.15,prosperity:-1},years:30},
     {label:'Evict them',detail:'Renewal +10% for 20 years.',effects:{renewal:.10},years:20}]},
  {id:'tech',from:1995,to:2025,near:'trade',title:'The Digital Gold Rush',
   text:'A technology company wants to build its campus on the old docks.',
   choices:[
     {label:'Roll out the red carpet',detail:'Innovation +15%, migration +8%; rents climb (housing −6%).',effects:{innovation:.15,migration:.08,housing:-.06},years:30},
     {label:'Protect affordable housing',detail:'Housing +6%, prosperity +2 for 30 years.',effects:{housing:.06,prosperity:2},years:30}]}
];
// Responses to disasters, opened right after one strikes (if events are on).
export const DISASTER_RESPONSES={
  fire:{title:'After the Fire',text:'Smoke still rises over the burnt streets. How will the city rebuild?',
    choices:[
      {label:'Rebuild in brick and stone',detail:'Slower but safer: renewal +10%, fewer fires for 60 years.',funds:-.15,effects:{renewal:.10},years:60,fireproof:true},
      {label:'Rebuild quickly in timber',detail:'Housing +5% for 10 years.',effects:{housing:.05},years:10}]},
  flood:{title:'After the Flood',text:'The water has receded, leaving mud and ruined cellars.',
    choices:[
      {label:'Raise the dykes',detail:'Costly; prosperity +2 for 40 years.',funds:-.2,effects:{prosperity:2},years:40},
      {label:'Clean up and carry on',detail:'The river will be back. Prosperity −1 for 10 years.',effects:{prosperity:-1},years:10}]},
  epidemic:{title:'In the Plague Year',text:'Carts collect the dead at dawn. The physicians wait for orders.',
    choices:[
      {label:'Open a pest house',detail:'Services +10% for 20 years.',funds:-.12,effects:{services:.10},years:20},
      {label:'Ring the bells and pray',detail:'Faith +8% for 15 years.',effects:{faith:.08},years:15}]}
};
export const EVENT_INDEX=Object.fromEntries(EVENTS.map(e=>[e.id,e]));

// ───────────── v2.0: Era Trials ─────────────
// Before each era draft history sets a trial, announced TRIAL_LEAD years
// ahead and due the year before the draft. Two answers always exist (pay, or
// suffer); a city with a doctrine at tier 2 or more also gets that doctrine's
// own answer, which costs nothing and makes the next draft better (one more
// card, better odds). Undecided, the trial takes its harsher course.
export const TRIAL_LEAD=8;
export const TRIALS={
  1500:{title:'The Sweating Sickness',near:'res',text:'A fever runs through the crowded lanes faster than the physicians can walk.',
    choices:[{label:'Hire physicians, cart away the dead',detail:'A bill for the treasury.',funds:-.15},
             {label:'Shut the doors and wait',detail:'3% of residents die; prosperity −2 for 20 years.',residents:-.03,effects:{prosperity:-2},years:20}]},
  1750:{title:'The Great Fire',near:'res',text:'A baker’s oven sets a whole quarter of timber houses alight.',
    choices:[{label:'Rebuild with the treasury',detail:'A bill for the treasury.',funds:-.18},
             {label:'Let the owners rebuild',detail:'3% of residents leave; housing −4% for 20 years.',residents:-.03,effects:{housing:-.04},years:20}]},
  1850:{title:'The Year of Revolutions',near:'civic',text:'Barricades go up in the market square; the crowd wants bread and a vote.',
    choices:[{label:'Buy calm with bread and wages',detail:'A bill for the treasury.',funds:-.18},
             {label:'Call out the guard',detail:'2% of residents flee; prosperity −2 for 20 years.',residents:-.02,effects:{prosperity:-2},years:20}]},
  1950:{title:'After the War',near:'res',text:'Whole streets are rubble and the returning soldiers need homes.',
    choices:[{label:'Borrow for reconstruction',detail:'A bill for the treasury.',funds:-.2},
             {label:'Make do',detail:'3% of residents leave; housing −4% for 25 years.',residents:-.03,effects:{housing:-.04},years:25}]},
  2000:{title:'The Factory Gates Close',near:'craft',text:'The old works shut one by one, and the docks fall quiet.',
    choices:[{label:'Retrain the workers',detail:'A bill for the treasury.',funds:-.2},
             {label:'Let the market decide',detail:'3% of residents leave; prosperity −2 for 20 years.',residents:-.03,effects:{prosperity:-2},years:20}]}
};
export const TRIAL_ANSWERS={
  faith:{label:'The confraternities take care of it',effects:{faith:.06}},
  industry:{label:'The guilds put everyone to work',effects:{industry:.06}},
  trade:{label:'The merchants buy relief abroad',effects:{trade:.06}},
  arts:{label:'A festival restores the city’s spirit',effects:{arts:.06}},
  learning:{label:'Follow the scholars’ plan',effects:{education:.06}},
  people:{label:'Neighbours help neighbours',effects:{migration:.05}}
};
const DOCTRINE_LABEL={faith:'Faith',industry:'Industry',trade:'Trade',arts:'Arts',learning:'Learning',people:'People'};
// id: trial:<draft year>:<doctrine or none>
export function trialDefinition(id){
  const [,y,d]=String(id).split(':'),t=TRIALS[y];if(!t)return null;
  const a=TRIAL_ANSWERS[d],choices=[...t.choices];
  if(a)choices.push({label:`${DOCTRINE_LABEL[d]}: ${a.label.charAt(0).toLowerCase()+a.label.slice(1)}`,detail:'No cost. Your next era draft offers one more card, with better odds of Rare and Epic cards.',effects:a.effects,years:20,boon:true});
  return {...t,trial:true,year:Number(y),doctrine:a?d:null,choices};
}
// Announce the trial for the next draft (sim calls this yearly).
export function maybeTrial(city,year,draftYear,doctrine){
  if(!city.eventsOn||!TRIALS[draftYear]||year!==draftYear-1-TRIAL_LEAD)return null;
  const id=`trial:${draftYear}:${doctrine||'none'}`;
  if(omensOf(city).some(o=>o.id.startsWith(`trial:${draftYear}:`))||(city.seenEvents||[]).includes(`trial:${draftYear}`))return null;
  const def=trialDefinition(id),spot=eventSpot(city,def.near,rand(hash(city.seed,year,4441)));
  return {id,year,trial:true,title:def.title,text:def.text,x:spot.x,y:spot.y,options:def.choices.map(c=>({label:c.label,detail:c.detail}))};
}

// Treasury effects scale with what the city can afford: a share of a year's
// typical budget, never less than a token amount.
export function eventScale(city){return Math.max(80,Math.round(Math.sqrt(Math.max(1,city.residents||0)/K)*22));}

// Pick a position for the caption near a building of the right kind.
export function eventSpot(city,near,r=Math.random){
  const pool=city.buildings.filter(b=>!b.vacant&&(near==='civic'?b.type==='civic'||b.special:b.type===near));
  const list=pool.length?pool:city.buildings;
  const b=list[Math.floor(r()*list.length)];
  return b?{x:b.x+.5,y:b.y+.5}:{x:50,y:36};
}

// Does a historical event knock this year? Roughly one per generation.
export function maybeEvent(city,year,blocked){
  if(!city.eventsOn||city.event||blocked||city.buildings.length<18)return null;
  // One historical question at a time (v1.6 omens are announced ahead).
  // v2.0: Era Trials run alongside ordinary history.
  if(omensOf(city).some(o=>!o.id.startsWith('disaster:')&&!o.id.startsWith('trial:')))return null;
  const seen=new Set(city.seenEvents||[]);
  const last=city.lastEventYear||0;
  if(year-last<12)return null;
  const r=rand(hash(city.seed,year,77123));
  const due=EVENTS.filter(e=>!seen.has(e.id)&&year>=e.from&&year<=e.to&&(!e.water||WATER.includes(city.type)));
  if(!due.length)return null;
  // Certain when an event's window is about to close, likely otherwise.
  const closing=due.find(e=>e.to-year<=2);
  if(!closing&&r()>.11)return null;
  const ev=closing||due[Math.floor(r()*due.length)];
  return openEvent(city,ev,year,r,eventSpot(city,ev.near,r));
}
function openEvent(city,ev,year,r,spot){
  return {id:ev.id,year,title:ev.title,text:ev.text,x:spot.x,y:spot.y,
    options:ev.choices.map(c=>({label:c.label,detail:c.detail}))};
}
export function disasterEvent(city,kind,year,spot){
  if(!city.eventsOn||city.event||!DISASTER_RESPONSES[kind])return null;
  if(omensOf(city).some(o=>o.id===`disaster:${kind}`))return null;
  const d=DISASTER_RESPONSES[kind];
  return {id:`disaster:${kind}`,year,title:d.title,text:d.text,x:spot.x,y:spot.y,options:d.choices.map(c=>({label:c.label,detail:c.detail}))};
}
export function eventDefinition(id){
  if(typeof id!=='string')return null;
  if(id.startsWith('disaster:'))return DISASTER_RESPONSES[id.slice(9)]||null;
  if(id.startsWith('trial:'))return trialDefinition(id);
  return EVENT_INDEX[id]||null;
}
// Timed modifiers still in force.
export function timedEffects(city){
  const out={};
  for(const t of city.effectsTimed||[])if((city.year||0)<t.until)for(const [k,v] of Object.entries(t.effects||{}))out[k]=(out[k]||0)+v;
  return out;
}
export function fireproofed(city){return (city.effectsTimed||[]).some(t=>t.fireproof&&(city.year||0)<t.until);}

// ───────────── v1.6: telegraphed history (no more pausing) ─────────────
// A historical event is announced OMEN_LEAD years before it arrives; a
// disaster asks for a response within AFTERMATH_YEARS. The player may choose
// (and change their mind) at any time before the deadline, while the clock
// runs. On the due date the choice applies. Undecided: a calamity takes its
// harshest course, nothing else happens, and indecision costs prosperity.
export const OMEN_LEAD=6,AFTERMATH_YEARS=2,INDECISION_YEARS=15,INDECISION_EFFECTS={prosperity:-2};
export function omensOf(city){return Array.isArray(city?.omens)?city.omens:[];}
export function announceOmen(city,ev,year,lead){
  if(!ev)return null;
  const omen={...ev,announced:year,due:year+lead,choice:null};
  city.omens=[...omensOf(city).filter(o=>o.id!==ev.id),omen];
  return omen;
}
// The harshest course: the response that costs the most residents, if any does.
export function fallbackChoice(def){
  let worst=-1,low=0;
  (def?.choices||[]).forEach((c,i)=>{if((c.residents||0)<low){low=c.residents;worst=i;}});
  return worst;
}
export function undecidedText(def){
  const i=fallbackChoice(def);
  return i>=0?`If the council never decides, events take their harshest course (${def.choices[i].label.toLowerCase()}) and prosperity falls by 2 for ${INDECISION_YEARS} years.`:`If the council never decides, the moment passes and prosperity falls by 2 for ${INDECISION_YEARS} years.`;
}
export function answerOmen(city,id,index){
  const omens=omensOf(city),omen=omens.find(o=>o.id===id);
  if(!omen)return {city,error:'That decision has already been taken'};
  const def=eventDefinition(id);if(!def?.choices?.[index])return {city,error:'Unknown response'};
  if(city.finished)return {city,error:'The chronicle is complete'};
  return {city:{...city,omens:omens.map(o=>o===omen?{...o,choice:index}:o)},error:null};
}
// Apply one response to a working copy (shared by resolveEvent and deadlines).
export function applyEventChoice(next,ev,index,year){
  const def=eventDefinition(ev.id),choice=def?.choices?.[index];if(!choice)return null;
  const scale=eventScale(next),df=doctrineFlags(next);
  const residents=choice.residents<0&&df.harshHalved?choice.residents/2:choice.residents;
  if(residents)next.residents=Math.max(40*K,Math.round(next.residents*(1+residents)));
  if(choice.funds)next.funds=choice.funds>0?next.funds+Math.round(choice.funds*scale*4):next.funds-Math.min(Math.max(0,next.funds),Math.round(-choice.funds*scale*4*(df.eventFundsMult||1)));
  next.effectsTimed=[...(next.effectsTimed||[])].filter(t=>t.until>year);
  if(choice.effects&&choice.years)next.effectsTimed.push({source:ev.id,label:`${def.title}: ${choice.label}`,until:year+choice.years,effects:choice.effects,...(choice.fireproof?{fireproof:true}:{})});
  return choice;
}
// Resolve every omen whose deadline has come. Mutates `city`; returns what happened.
export function resolveDueOmens(city,year){
  const due=omensOf(city).filter(o=>o.due<=year);if(!due.length)return [];
  city.omens=omensOf(city).filter(o=>o.due>year);city.events=[...city.events];
  const out=[];
  for(const o of due){
    const def=eventDefinition(o.id);if(!def)continue;
    const answered=Number.isInteger(o.choice)&&!!def.choices[o.choice];
    const index=answered?o.choice:fallbackChoice(def);
    const choice=index>=0?applyEventChoice(city,o,index,year):null;
    if(!answered){city.effectsTimed=[...(city.effectsTimed||[]).filter(t=>t.until>year),{source:`indecision:${o.id}`,label:`${def.title}: no decision`,until:year+INDECISION_YEARS,effects:INDECISION_EFFECTS}];}
    const what=answered?`The council chose: ${choice.label.toLowerCase()}.`:choice?`No decision was taken, and events took their harshest course: ${choice.label.toLowerCase()}.`:'No decision was taken, and the moment passed.';
    city.events.push({year,type:'history',eventId:o.id,x:o.x,y:o.y,title:def.title,choice:answered?choice.label:'No decision',undecided:!answered,text:`${def.text} ${what}`});
    out.push({omen:o,answered,choice});
  }
  return out;
}
export function normalizeOmens(list){
  if(!Array.isArray(list))return [];
  return list.filter(o=>o&&eventDefinition(o.id)&&Number.isFinite(o.due)&&Array.isArray(o.options))
    .map(o=>({...o,announced:Number(o.announced)||o.year||o.due,choice:Number.isInteger(o.choice)?o.choice:null}));
}
