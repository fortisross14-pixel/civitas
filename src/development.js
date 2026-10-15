// CIVITAS v0.7.1 — development momentum versus enduring accumulated prosperity.
// Scores are volatile 0–100 *conditions*, not permanent asset totals. Investments
// create bursts of progress; progress made while conditions are excellent persists.
export const AXES=['economy','technology','culture','faith','infrastructure','attraction'];
export const AXIS_LABELS={economy:'Economy',technology:'Technology',culture:'Culture',faith:'Religion',infrastructure:'Infrastructure',attraction:'Population attraction'};
export const INITIAL_DEVELOPMENT={economy:22,technology:18,culture:20,faith:18,infrastructure:25,attraction:22};
// Annual retention: short-lived infrastructure/immigration pressure needs renewed
// attention; built heritage and institutions retain influence a little longer.
export const DECAY_PER_YEAR={economy:.012,technology:.010,culture:.0085,faith:.0085,infrastructure:.014,attraction:.014};
const clamp=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,v));
export function developmentOf(city){return Object.fromEntries(AXES.map(k=>[k,clamp(Number.isFinite(Number(city?.development?.[k]))?Number(city?.development?.[k]):INITIAL_DEVELOPMENT[k])]));}
const EFFECT_AXIS={
 economy:{gdp:62,industry:36,trade:36,treasury:15,industrialMultiplier:25,industryPerThousand:18,universityProductivity:25,knowledgePerUniversity:15},
 technology:{education:46,innovation:55,universityProductivity:32,knowledgePerUniversity:30,services:13,renewal:10},
 culture:{arts:52,artsMultiplier:36,heritage:29,tourismIncome:17,tourismPerMonument:22},
 faith:{faith:51,faithMultiplier:36,pilgrimage:25,faithEducation:17},
 infrastructure:{transport:49,development:30,renewal:26,services:27,newHousing:8},
 attraction:{migration:45,births:21,housing:16,newHousing:20,prosperity:1.4,faithMigration:22,merchantMigration:22}
};
// The pulse isn't a generic +10% stat: high-rarity cards and figures can generate
// large new 0–100 strategic opportunities. Returns a delta in score points.
export function opportunityPulse(effects={},rarity='common',type='card'){
 const result={};
 const rarityPower={common:1,uncommon:1.08,rare:1.2,epic:1.45,legend:1.75}[rarity]||1;
 for(const k of AXES){let strength=0;
  for(const [effect,scale] of Object.entries(EFFECT_AXIS[k]))strength+=Math.max(0,Number(effects[effect])||0)*scale;
  result[k]=Math.round(Math.min(type==='figure'?78:65,strength*rarityPower)*10)/10;
 }
 return result;
}
export function applyPulse(city,effects,rarity='common',type='card',explicit={}){
 const base=developmentOf(city),pulse=opportunityPulse(effects,rarity,type),next={};
 for(const k of AXES){
  // Diminishing headroom prevents +60 stacked onto 90 trivially overflowing 100,
  // while retaining spectacular early bonuses (48 + 40 = 88).
  next[k]=Math.round(clamp(base[k]+Math.max(pulse[k],Number(explicit[k])||0)*(1-Math.max(0,base[k]-70)/100))*10)/10;
 }
 return {...city,development:next};
}
// Existing physical buildings maintain the development climate a little; an
// unplaced free university or monument produces NO benefit.
export function institutionalSupport(city){
 const standing=new Set((city.buildings||[]).map(b=>b.id));
 const kinds=(city.landmarks||[]).filter(l=>standing.has(l.id)).map(l=>l.kind);
 const n=k=>kinds.filter(v=>v===k).length;
 const figureFloor={economy:0,technology:0,culture:0,faith:0,infrastructure:0,attraction:0};
 const domainAxes={industry:['economy'],trade:['economy','infrastructure'],education:['technology'],culture:['culture'],religion:['faith'],population:['attraction']};
 for(const f of (city.figures||[])){
  // Unique great people are persistent institutional legacies in this stylized
  // alternate-history model, not immortal active residents.
  const domains=domainAxes[f.domain]||(f.id==='brunel'?domainAxes.trade:f.id==='tesla'||f.id==='leonardo'?domainAxes.education:f.id==='michelangelo'?domainAxes.culture:[]);
  for(const domain of domains)figureFloor[domain]+={common:1.5,uncommon:3,rare:5,epic:9,legend:17}[f.rarity]||1;
 }
 return {
  economy:Math.min(28,figureFloor.economy+n('port')*5+n('market')*1.5+n('station')*2),
  technology:Math.min(38,figureFloor.technology+n('university')*8+n('research_center')*8+n('school')*1.5),
  culture:Math.min(38,figureFloor.culture+n('monument')*4+n('workshop')*6+n('museum')*5),
  faith:Math.min(38,figureFloor.faith+n('shrine')*7+n('monastery')*7+n('chapel')*2),
  infrastructure:Math.min(28,figureFloor.infrastructure+n('station')*4+n('transit_hub')*6+n('boulevard')*4),
  attraction:Math.min(28,figureFloor.attraction+n('hospital')*2+n('gardens')*3+n('monument')*1.5)
 };
}
export function advanceDevelopment(city,years){
 const source=developmentOf(city),support=institutionalSupport(city),next={};
 for(const k of AXES){
  // Institutions establish a *maintenance floor*, not continuous compounding.
  // E.g. 88 economy becomes about 61 after 35 years without reinvestment.
  const floor=Math.min(45,(support[k]||0)+2);
  const retention=Math.exp(-DECAY_PER_YEAR[k]*years);
  next[k]=Math.round(clamp(floor+(source[k]-floor)*retention)*10)/10;
 }
 return {...city,development:next};
}
// Returns annual, real productivity growth. Progress is exponential but constrained
// by era and market readiness. At modern score ~20: ~0.8–1.2%; strong 85+ scores
// can reach ~2.5–3%; a collapsed city may shrink in productivity.
const PRODUCTIVITY_ERAS=[
 {until:1750,normal:.0030,peak:.0095},
 {until:1850,normal:.0075,peak:.0160},
 {until:1950,normal:.0130,peak:.0250},
 {until:2000,normal:.0180,peak:.0310},
 {until:Infinity,normal:.0190,peak:.0320}
];
export function productivityGrowth(year,d,unemployment=0){
 const era=PRODUCTIVITY_ERAS.find(e=>year<e.until);
 const combined=.52*d.economy+.48*d.technology;
 // 0/100: mild contraction; 20/100: era-normal growth (~1.9% in 2000+);
 // 80/100: exceptional growth. This is a curve, NOT flat bonuses.
 const rate=combined<=20
  ?-.002+(era.normal+.002)*combined/20
  :era.normal+(era.peak-era.normal)*(combined-20)/60;
 const stress=Math.max(0,unemployment-18)*.00011;
 return Math.max(-.004,Math.min(.036,rate-stress));
}
export function referenceProductivity(year){
 let value=720,from=1300;
 for(const era of PRODUCTIVITY_ERAS){const until=Math.min(year,era.until);
  if(until>from)value*=Math.exp((until-from)*era.normal);
  from=until;if(from>=year)break;
 }
 return value;
}
// Historic gains allow taller buildings, larger firms and more valuable jobs.
// A modern city with 8x accumulated technological/economic productivity should
// have materially more development potential than an identical low-tech city.
export function developmentCapacity(city){
 const relative=Math.max(.05,(city.productivityStock||720)/Math.max(1,referenceProductivity(city.year)));
 const technology=developmentOf(city).technology;
 return Math.min(16,Math.max(.60,Math.pow(relative,.23)*(1+Math.max(0,Number(city.knowledgeCapital)||0)/110)*(.88+technology/200)));
}
export function accumulateDevelopment(city,years,unemployment=0){
 const d=developmentOf(city),annual=productivityGrowth(city.year,d,unemployment);
 const last=Number(city.productivityStock);
 const base=Number.isFinite(last)&&last>0?last:720;
 // Productive cities keep compounding, but real-world-style frontier effects make
 // each additional productivity breakthrough progressively harder at high levels.
 // This is a soft diminishing return, not an abrupt common ceiling for all builds.
 const frontierPressure=Math.max(0,(base-20000)/18000);
 const effectiveAnnual=annual>0?annual/(1+Math.pow(frontierPressure,2)):annual;
 const culturalBase=Math.max(0,Number(city.culturalCapital)||0);
 const faithBase=Math.max(0,Number(city.sacredCapital)||0);
 const techBase=Math.max(0,Number(city.knowledgeCapital)||0);
 return {...city,
  productivityStock:Math.round(Math.min(150_000,base*Math.exp(effectiveAnnual*years))*100)/100,
  culturalCapital:Math.min(200000,culturalBase+years*Math.max(0,d.culture-8)*.036),
  sacredCapital:Math.min(200000,faithBase+years*Math.max(0,d.faith-8)*.026),
  knowledgeCapital:Math.min(200000,techBase+years*Math.max(0,d.technology-8)*.035)
 };
}
export function balanceDiagnostics(city){const d=developmentOf(city);return {development:d,productivityGrowthPct:Math.round(productivityGrowth(city.year,d,0)*10000)/100};}
