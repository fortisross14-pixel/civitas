// Account-wide firsts. Each threshold must be met by one city, never by adding
// several cities together. Earned rewards remain earned after decline or undo.
const milestone=(id,group,name,metric,target,points,description)=>({id,group,name,metric,target,points,description});
export const ACHIEVEMENTS=[
 ...[[5000,50],[10000,75],[20000,100],[50000,150],[100000,250],[250000,400],[1000000,750]].map(([n,lp])=>milestone(`population_${n}`,'Population',`${n.toLocaleString('en-US')} residents`,'population',n,lp,`Reach ${n.toLocaleString('en-US')} residents in one city.`)),
 ...[[1000,'Normal',40],[2500,'Good',65],[5000,'High',100],[10000,'Very high',150],[25000,'Rich',250]].map(([n,label,lp])=>milestone(`income_${n}`,'Economy',`${label} income`,'gdpPerCapita',n,lp,`Reach ${n.toLocaleString('en-US')} modeled GDP per person.`)),
 ...[[1,40],[3,70],[5,110],[10,180]].map(([n,lp])=>milestone(`builder_${n}`,'Construction',n===1?'First commission':`${n} civic commissions`,'commissions',n,lp,`Construct ${n} civic or special building${n===1?'':'s'} in the same city. Founding buildings do not count.`)),
 milestone('culture_50','Culture','An artistic town','culturalPrestige',50,50,'Reach 50 cultural prestige.'),
 milestone('cultural_rebirth','Culture','Cultural Rebirth','culturalPrestige',120,100,'Reach 120 cultural prestige. Unlocks cultural card purchases.'),
 milestone('culture_300','Culture','A cultural capital','culturalPrestige',300,180,'Reach 300 cultural prestige.'),
 milestone('faith_50','Faith','A place of faith','religiousInfluence',50,50,'Reach 50 religious influence.'),
 milestone('sacred_heritage','Faith','Sacred Heritage','religiousInfluence',100,100,'Reach 100 religious influence. Unlocks Sacred City.'),
 milestone('faith_250','Faith','A pilgrimage city','religiousInfluence',250,180,'Reach 250 religious influence.'),
 milestone('education_50','Knowledge','A learned town','educationIndex',50,50,'Reach 50 education.'),
 milestone('education_150','Knowledge','A city of scholars','educationIndex',150,120,'Reach 150 education.'),
 milestone('knowledge_city','Knowledge','Knowledge City','universities',1,80,'Construct a university. Unlocks Knowledge Economy.'),
 milestone('industrial_hub','Industry','Industrial Hub','industry',25,100,'Have 25 industrial buildings in one city. Unlocks Industrial Revolution.'),
 milestone('prosperity_70','Quality of life','A good life','prosperity',70,60,'Reach 70 prosperity.'),
 milestone('prosperity_90','Quality of life','A flourishing city','prosperity',90,140,'Reach 90 prosperity.'),
 milestone('heritage_50','Heritage','Living history','heritage',50,100,'Preserve 50 standing buildings at least 120 years old.'),
 milestone('maritime_trade','Construction','Maritime Trade','ports',1,75,'Construct a Grand Port.'),
 milestone('epic_patron','Figures','Epic Patron','epicFigures',1,100,'Recruit an Epic historical figure into a city.'),
 milestone('legendary_founder','Figures','Legendary Founder','legendFigures',1,200,'Recruit a Legendary historical figure into a city.')
];
export const ACHIEVEMENT_INDEX=Object.fromEntries(ACHIEVEMENTS.map(a=>[a.id,a]));
const surveyValues=new WeakMap();
function structureValues(map,year){
 const values={commissions:(map.landmarks||[]).filter(l=>l.source&&l.source!=='founding').length,universities:0,industry:0,ports:0,heritage:0};
 for(const b of map.buildings||[]){if(b.special==='university')values.universities++;if(b.type==='craft')values.industry++;if(b.special==='port')values.ports++;if(Number.isFinite(b.born)&&year-b.born>=120)values.heritage++;}
 return values;
}

export function achievementValues(city,current={}){
 const values={};
 const include=row=>{for(const [key,value] of Object.entries(row||{}))if(typeof value==='number'&&Number.isFinite(value))values[key]=Math.max(values[key]||0,value);};
 include(current);
 for(const row of city.history||[])if(row.year<=city.year)include(row);
 include(structureValues(city,city.year));
 // Saved surveys are immutable; avoid rescanning thousands of old buildings
 // on every live calendar tick.
 for(const map of city.snapshots||[])if(map.year<=city.year){if(!surveyValues.has(map))surveyValues.set(map,structureValues(map,map.year));include(surveyValues.get(map));}
 include({commissions:(city.events||[]).filter(e=>e.year<=city.year&&e.type==='landmark'&&/constructed at parcel/.test(e.text||'')).length,
  epicFigures:(city.figures||[]).filter(f=>f.rarity==='epic').length,
  legendFigures:(city.figures||[]).filter(f=>f.rarity==='legend').length});
 return values;
}

export function achievementProgress(cities,samples=new Map()){
 const best={};
 for(const city of cities){const values=achievementValues(city,samples.get(city.id));for(const [key,value] of Object.entries(values))if(!best[key]||value>best[key].value)best[key]={value,cityName:city.name};}
 return ACHIEVEMENTS.map(a=>({...a,value:best[a.metric]?.value||0,cityName:best[a.metric]?.cityName||null}));
}
