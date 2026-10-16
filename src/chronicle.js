// CIVITAS v0.6 — chronological records and historical comparisons.
// Pure, side-effect free, no invented values for real-world cities.
export const METRICS={
 economyScore:{name:'Economic momentum',unit:'score / 100',label:'Economic momentum'},
 technologyScore:{name:'Technology momentum',unit:'score / 100',label:'Technology'},
 cultureScore:{name:'Culture momentum',unit:'score / 100',label:'Culture momentum'},
 faithScore:{name:'Religious momentum',unit:'score / 100',label:'Religious momentum'},
 infrastructureScore:{name:'Infrastructure momentum',unit:'score / 100',label:'Infrastructure momentum'},
 attractionScore:{name:'Migration attraction momentum',unit:'score / 100',label:'Attraction'},
 population:{name:'Population',unit:'residents',label:'Residents'},
 gdp:{name:'Modeled GDP',unit:'game currency',label:'GDP · game estimate'},
 gdpPerCapita:{name:'GDP per capita',unit:'game currency/person',label:'GDP/person · game estimate'},
 prosperity:{name:'Prosperity',unit:'index / 100',label:'Prosperity'},
 unemployment:{name:'Unemployment',unit:'percent',label:'Unemployment'},
 infrastructureEfficiency:{name:'Infrastructure efficiency',unit:'index / 100',label:'Infrastructure'},
 culturalPrestige:{name:'Cultural prestige',unit:'game index',label:'Culture'},
 tourismAppeal:{name:'Tourism appeal',unit:'game index',label:'Tourism'},
 religiousInfluence:{name:'Religious influence',unit:'game index',label:'Religion'},
 educationIndex:{name:'Education',unit:'game index',label:'Education'},
 densityPerZone:{name:'Urban density',unit:'residents / residential cell',label:'Density'},
 heritage:{name:'Historic buildings',unit:'standing buildings',label:'Heritage'}
};
export const metricValue=(sample,metric)=>{const n=Number(sample?.[metric]);return Number.isFinite(n)?n:null;};
export const numberText=n=>n==null||!Number.isFinite(Number(n))?'—':Math.round(Number(n)).toLocaleString('en-US');
// Each simulated sample is a completed 5-year interval. Never read from the future.
export function historyAt(city,year){
 const rows=(city?.history||[]).filter(r=>Number.isFinite(r.year)&&r.year<=year).sort((a,b)=>a.year-b.year);
 return rows.at(-1)||null;
}
export function metricAt(city,year,metric){const h=historyAt(city,year);return metricValue(h,metric);}
export function currentSample(city){return historyAt(city,city?.year??2030);}
export function metricSeries(city,metric){return (city?.history||[]).filter(h=>Number.isFinite(h.year)&&metricValue(h,metric)!==null).map(h=>({year:h.year,value:metricValue(h,metric)})).sort((a,b)=>a.year-b.year);}
export function peakRecord(city,metric){const series=metricSeries(city,metric);if(!series.length)return null;return series.reduce((best,x)=>x.value>best.value?x:best,series[0]);}
export function cityRecords(city){
 const buildings=city?.buildings||[],events=city?.events||[],history=city?.history||[];
 const surviving=buildings.filter(b=>Number.isFinite(b.born)).sort((a,b)=>a.born-b.born);
 const cards=city?.turning?.choices||[];
 const born=(city?.history||[])[0]?.year??1300;
 let biggestGain=null;
 for(let i=1;i<history.length;i++){
  const a=history[i-1],b=history[i];if(!Number.isFinite(a.population)||!Number.isFinite(b.population))continue;
  const gain=b.population-a.population;
  if(!biggestGain||gain>biggestGain.gain)biggestGain={year:b.year,from:a.year,gain};
 }
 return {population:peakRecord(city,'population'),gdp:peakRecord(city,'gdp'),gdpPerCapita:peakRecord(city,'gdpPerCapita'),culturalPrestige:peakRecord(city,'culturalPrestige'),tourismAppeal:peakRecord(city,'tourismAppeal'),religiousInfluence:peakRecord(city,'religiousInfluence'),educationIndex:peakRecord(city,'educationIndex'),prosperity:peakRecord(city,'prosperity'),infrastructureEfficiency:peakRecord(city,'infrastructureEfficiency'),densityPerZone:peakRecord(city,'densityPerZone'),heritage:peakRecord(city,'heritage'),oldestSurvivor:surviving[0]||null,mostGrowth:biggestGain,years:Math.max(0,(city?.year??born)-born),turningPoints:cards.length,figures:(city?.figures||[]).length,events:events.length,snapshots:(city?.snapshots||[]).length,lost:(city?.sites||[]).length};
}
const PERIODS=[{name:'Medieval',start:1300,end:1499},{name:'Early modern',start:1500,end:1749},{name:'Industrial transition',start:1750,end:1899},{name:'Metropolitan',start:1900,end:1949},{name:'Modern',start:1950,end:1999},{name:'Contemporary',start:2000,end:2030}];
export function identityOf(city){
 const row=currentSample(city)||{},s=cityRecords(city);
 const scores=[
  ['The Artistic City',Number(row.culturalPrestige||0)/70+Number(row.tourismAppeal||0)/120,'culture'],
  ['The Sacred City',Number(row.religiousInfluence||0)/70,'religion'],
  ['The Knowledge City',Number(row.educationIndex||0)/75,'education'],
  ['The Great Metropolis',Number(row.population||0)/144000,'population'],
  ['The Prosperous City',Number(row.gdpPerCapita||0)/42000,'economy'],
  ['The Historic Town',Number(row.heritage||0)/90,'heritage']
 ].sort((a,b)=>b[1]-a[1]);
 if(!city?.finished&&city?.year<1450)return 'A New Settlement';
 if((s?.population?.value||0)<24000&&city?.year>=1800)return 'The Quiet Town';
 return scores[0][1]>=.55?scores[0][0]:'The Growing City';
}
const EVENT_LABEL={fire:'Fire',flood:'Flood',epidemic:'Epidemic',boom:'Economic boom',redevelopment:'Redevelopment',preservation:'Preservation',card:'Turning Point chosen',turning_point:'Turning Point',synergy:'Synergy',landmark:'Landmark',migration:'Migration',era:'Historical era'};
export function timelineItems(city){
 const output=[];const seen=new Set();
 const add=(item)=>{const key=`${item.year}|${item.type}|${item.text}`;if(!seen.has(key)){seen.add(key);output.push(item);}};
 for(const e of city?.events||[])if(Number.isFinite(e.year))add({year:e.year,type:e.type||'event',title:e.type==='history'?e.title||'Historical event':EVENT_LABEL[e.type]||'City event',text:String(e.text||''),category:['fire','flood','epidemic'].includes(e.type)?'crisis':['card','turning_point','synergy','history'].includes(e.type)?'decision':'development'});
 for(const p of city?.turning?.choices||[])if(Number.isFinite(p.year)&&!(city?.events||[]).some(e=>e.year===p.year&&e.type==='card'))add({year:p.year,type:'pick',title:'Turning Point',text:`A strategic card was chosen: ${p.cardId.replaceAll('_',' ')}.`,category:'decision'});
 for(const f of city?.figures||[])if(Number.isFinite(f.year))add({year:f.year,type:'figure',title:'Historical figure',text:`${f.name} joined the city (${f.rarity}).`,category:'decision'});
 for(const l of city?.landmarks||[])if(Number.isFinite(l.year||l.born))add({year:l.year||l.born,type:'landmark',title:'Landmark',text:`${l.label||l.kind||'Landmark'} was constructed.`,category:'development'});
 const levels=[1000,5000,10000,25000,50000,100000,250000,500000,1000000];
 const h=(city?.history||[]).slice().sort((a,b)=>a.year-b.year);
 for(const t of levels){const at=h.find((x,i)=>x.population>=t&&(i===0||h[i-1].population<t));if(at)add({year:at.year,type:'population',title:'Population milestone',text:`Population first reached ${numberText(t)} residents.`,category:'milestone'});}
 return output.sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title));
}
export function periodSummary(city){return PERIODS.filter(p=>p.start<=(city?.year||1300)).map(p=>{
 const first=historyAt(city,p.start),last=historyAt(city,Math.min(p.end,city.year));
 const events=timelineItems(city).filter(e=>e.year>=p.start&&e.year<=p.end);
 return {...p,from:first?.population??null,to:last?.population??null,eventCount:events.length,active:p.start<=city.year};
});}
export function atlasRecords(cities){const series=(cities||[]).filter(c=>c&&c.history?.length);
 const best=(metric)=>series.map(c=>({city:c,peak:peakRecord(c,metric)})).filter(v=>v.peak).sort((a,b)=>b.peak.value-a.peak.value)[0]||null;
 return {largest:best('population'),richest:best('gdpPerCapita'),cultural:best('culturalPrestige'),religious:best('religiousInfluence'),tourism:best('tourismAppeal'),heritage:best('heritage')};
}
// Primary/civic sources. Do not use this small dataset to fabricate GDP or
// interpolate undocumented dates. Values are historic census observations or
// official historical estimates and always retain the actual observation year.
export const HISTORICAL_CITIES=[
 {id:'nyc',name:'New York City',definition:'Census-era city boundaries vary; 1898 consolidation affects comparability',source:'U.S. Census Bureau',url:'https://www.census.gov/dataviz/visualizations/036/508.php',samples:[[1800,60515],[1850,515547],[1900,3437202],[1950,7891957],[2000,8008278]]},
 {id:'london',name:'London',definition:'Historical population estimates for present-day Greater London area',source:'London Datastore / ONS',url:'https://data.london.gov.uk/dataset/historical-census-population-expjm',samples:[[1801,1011157],[1851,2286609],[1901,6226494],[1951,8164416]]},
 {id:'barcelona',name:'Barcelona',definition:'Municipality, not Barcelona province',source:'Idescat — historical municipal census',url:'https://www.idescat.cat/pub/?geo=mun%3A080193%2Cprov%3A08&id=shd&lang=en&n=1341',samples:[[1787,100160],[1857,235060],[1900,544137],[1950,1280179],[1991,1681132]]}
];
export function historicalPopulationsAt(year,tolerance=13){return HISTORICAL_CITIES.map(c=>{
  const matches=c.samples.filter(([y])=>Math.abs(y-year)<=tolerance).sort((a,b)=>Math.abs(a[0]-year)-Math.abs(b[0]-year));
  if(!matches.length)return null;
  return {id:c.id,name:c.name,year:matches[0][0],value:matches[0][1],source:c.source,url:c.url,definition:c.definition,kind:'historical'};
 }).filter(Boolean);}
export function compareAt(cities,year,metric,{includeHistorical=true}={}){
 const result=(cities||[]).filter(c=>c&&Number.isFinite(c.year)).map(c=>{
  if(c.year<year)return null; // An unfinished city has no future historical observations.
  const row=historyAt(c,year);if(!row)return null;
  const value=metricValue(row,metric);if(value===null)return null;
  return {id:c.id,name:c.name,year:row.year,value,kind:'player',finished:!!c.finished,definition:'CIVITAS simulated city; fictional geography and game-model metric'};
 }).filter(Boolean);
 if(includeHistorical&&metric==='population')result.push(...historicalPopulationsAt(year));
 return result.sort((a,b)=>b.value-a.value);
}
export function shareSummary(city){const r=cityRecords(city),h=currentSample(city);return `${city.name} — ${identityOf(city)}\nYears: 1300–${city.year}\nPopulation: ${numberText(h?.population)} (peak ${numberText(r.population?.value)} in ${r.population?.year??'—'})\nModeled GDP/person: ${numberText(h?.gdpPerCapita)}\nCultural prestige: ${numberText(h?.culturalPrestige)}\nReligious influence: ${numberText(h?.religiousInfluence)}\nTurning Points: ${r.turningPoints}/20 · Figures: ${r.figures}\nCIVITAS: Chronicle of Cities`;}
