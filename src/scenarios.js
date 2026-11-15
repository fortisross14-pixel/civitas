// CIVITAS v2.6 — Scenarios: short, hand-written runs (100–200 years) with a
// city already under way, one clear objective and three stars. Names and
// places are fictional; each is inspired by a real city and moment, named in
// its story. Winning one gives its trinket (trinkets.js) for every later run.
//
// This file is data plus pure rules. It imports nothing from sim.js: sim.js
// calls scenarioYear() once a year with the city's stats.

// Stat keys a goal can read. s: stats(city).
export const GOAL_STATS={
  population:{label:'Population',read:s=>s.population},
  industry:{label:'Industry',read:s=>s.sectorJobs?.craft||0},
  faith:{label:'Faith',read:s=>s.religiousInfluence},
  culture:{label:'Culture',read:s=>s.culturalPrestige},
  learning:{label:'Learning',read:s=>s.educationIndex},
  prosperity:{label:'Prosperity',read:s=>s.prosperity}
};

// start.from: 'fresh' founds a new town in the start year; otherwise the id of
// a prebuilt city in public/scenarios/ (scripts/build-scenarios.mjs grows them).
// goals[0] is ★; ★★ adds goals[1]; ★★★ adds goals[2]. A goal with `by` must be
// met by that year; without it, by the end. `keep` goals must hold at the end.
export const SCENARIOS=[
 {id:'ford_market',name:'The Ford at Aldmere',from:1300,to:1420,type:'river',seed:31013,founder:'merchant',start:{from:'fresh'},
  blurb:'Turn a river ford into a market town.',
  story:'Inspired by the chartered market towns of England and Flanders: Stratford-upon-Avon was granted its market in 1196 and laid out its burgage plots along a ford of the Avon. Learn zoning, building cards and the Market Hall.',
  goals:[{stat:'population',min:4700},{stat:'prosperity',min:62,keep:true},{stat:'population',min:4700,by:1405}],
  reward:'market_cross',lesson:true},
 {id:'black_year',name:'The Black Year of Vellmar',from:1340,to:1420,type:'coast',seed:22041,founder:'reeve',start:{from:'black_year'},
  blurb:'The plague takes half the town. Bring it back.',
  story:'Inspired by the Black Death, which reached Florence and Genoa in 1348 and killed between a third and a half of their people. Here it arrives in 1348; you must regain the population of 1340.',
  script:[{year:1348,kind:'plague',share:.45,text:'The Great Mortality: nearly half the town is dead.'}],
  goals:[{stat:'population',min:'start',factor:1.05},{stat:'prosperity',min:52,keep:true},{stat:'population',min:'start',factor:1.05,by:1400}],
  reward:'plague_bell'},
 {id:'pilgrim_road',name:'Santa Croce of the Way',from:1350,to:1550,type:'plain',seed:41777,founder:'abbess',start:{from:'pilgrim_road'},
  blurb:'Make a shrine town the goal of every pilgrim.',
  story:'Inspired by Santiago de Compostela and Toledo: medieval cities that grew rich and famous around a shrine, its cathedral and the road of pilgrims that led to it.',
  goals:[{stat:'faith',min:400},{stat:'population',min:11000},{stat:'faith',min:400,by:1500}],
  reward:'pilgrim_shell'},
 {id:'canal_city',name:'The Golden Age of Velhaven',from:1580,to:1700,type:'estuary',seed:51229,founder:'painter',start:{from:'canal_city'},
  blurb:'Refugees, ships and painters: a golden century.',
  story:'Inspired by Amsterdam after the fall of Antwerp in 1585, when merchants and craftsmen fled north and the city built its ring of canals, its exchange and its school of painters.',
  script:[{year:1585,kind:'migrants',share:.2,text:'Merchants and craftsmen arrive from the fallen south.'}],
  goals:[{stat:'culture',min:150},{stat:'population',min:42000},{stat:'culture',min:150,by:1660}],
  reward:'canal_lock'},
 {id:'mill_abbey',name:'From Abbey to Mill',from:1760,to:1880,type:'river',seed:61403,founder:'millwright',start:{from:'mill_abbey'},
  blurb:'A quiet abbey town becomes a city of mills.',
  story:'Inspired by Manchester, a market and collegiate-church town that became "Cottonopolis" after its first steam mill (1781), and by Lille and Ghent on the continent. Turn faith into industry.',
  goals:[{stat:'industry',min:125000},{stat:'prosperity',min:70,keep:true},{stat:'industry',min:125000,by:1850}],
  reward:'steam_governor'},
 {id:'ensanche',name:'The Wide Grid of Marvell',from:1850,to:1950,type:'coast',seed:71881,founder:'wanderer',start:{from:'ensanche'},
  blurb:'Pull down the walls and lay out a new city.',
  story:'Inspired by Barcelona, where the walls fell in 1854 and Ildefons Cerdà’s Eixample (1859) laid out a grid of wide, chamfered blocks across the plain. Here the walls stay until you replace them.',
  rules:{keepWalls:true},
  goals:[{stat:'population',min:600000},{stat:'prosperity',min:75,keep:true},{stat:'population',min:600000,by:1935}],
  reward:'surveyors_square'},
 {id:'rebuilding',name:'The Ashes of Hartwald',from:1945,to:2000,type:'river',seed:81007,founder:'reeve',start:{from:'rebuilding'},
  blurb:'Half the city is rubble. Rebuild it.',
  story:'Inspired by Rotterdam (bombed in 1940), Warsaw and the German cities rebuilt after 1945, and by the "economic miracle" that followed. Regain the population before the war.',
  script:[{year:1945,kind:'war',share:.4,text:'The war is over. Two fifths of the city lies in ruins.'}],
  goals:[{stat:'population',min:'start',factor:1.25},{stat:'industry',min:'start',factor:1.3},{stat:'population',min:'start',factor:1.25,by:1975}],
  reward:'phoenix_furnace'},
 {id:'new_century',name:'The Docks of Brennport',from:1990,to:2030,type:'estuary',seed:91553,founder:'scholar',start:{from:'new_century'},
  blurb:'The factories close. Build a city of ideas.',
  story:'Inspired by Bilbao, whose Guggenheim Museum (1997) turned old docks into a destination, and by Manchester and Dublin’s Docklands. Turn the old works into a city of learning.',
  goals:[{stat:'learning',min:320},{stat:'prosperity',min:80,keep:true},{stat:'learning',min:320,by:2015}],
  reward:'silicon_wafer'}
];
export const SCENARIO_INDEX=Object.fromEntries(SCENARIOS.map(s=>[s.id,s]));

// Open in order: the first is always open, each later one once the one before has a star.
export function scenarioOpen(record,id){const i=SCENARIOS.findIndex(s=>s.id===id);if(i<=0)return i===0;return (record?.[SCENARIOS[i-1].id]?.stars||0)>=1;}

// A goal's target in numbers (`start` = the value when the scenario began).
export function goalTarget(goal,state){return goal.min==='start'?Math.max(1,Math.round((state?.startValues?.[goal.stat]||0)*(goal.factor||1))):goal.min;}
export function goalText(goal,state,def){
  const what=GOAL_STATS[goal.stat].label,n=goalTarget(goal,state);
  const num=n>=1e4?`${Math.round(n/1000)}k`:n.toLocaleString('en-US');
  const target=goal.min==='start'?`${what} ${goal.factor>1?'up':'back'} to ${num}`:`${what} ${num}`;
  return goal.keep?`${target} at the end`:goal.by?`${target} by ${goal.by}`:target;
}

// The state a scenario keeps on the city: {id, startValues, met:[year|null…], stars, done}.
export function scenarioState(def,s){
  const startValues=Object.fromEntries(Object.entries(GOAL_STATS).map(([k,g])=>[k,g.read(s)]));
  return {id:def.id,startValues,met:def.goals.map(()=>null),stars:0,done:false,fired:[]};
}
// Called by sim.js once a year (after the year's tick). Mutates city: scripted
// events, goal progress, stars, and finishing at the end year.
export function scenarioYear(city,year,readStats,rand=Math.random){
  const def=city.scenario&&SCENARIO_INDEX[city.scenario.id];if(!def||city.scenario.done)return;
  const st={...city.scenario,fired:[...(city.scenario.fired||[])]};
  for(const ev of def.script||[])if(year>=ev.year&&!st.fired.includes(ev.year)){applyScript(city,ev,year,rand);st.fired.push(ev.year);}
  // Goals count once the scripted history has happened (a recovery starts after the plague).
  const s=readStats(),settled=(def.script||[]).every(ev=>year>ev.year);
  const met=[...st.met];
  def.goals.forEach((g,i)=>{const v=GOAL_STATS[g.stat].read(s);if(g.keep)met[i]=v>=goalTarget(g,st)?year:null;
    else if(settled&&met[i]==null&&v>=goalTarget(g,st)&&(!g.by||year<=g.by))met[i]=year;});
  st.met=met;
  const stars=starsOf(def,st);
  const end=year>=def.to-1;
  city.scenario={...st,met,stars,done:end};
  if(end){city.scenario.finalStars=stars;city.scenarioEnd=true;}
}
export function starsOf(def,st){
  const m=st.met||[];if(m[0]==null)return 0;if(m[1]==null)return 1;return m[2]==null?2:3;
}
function applyScript(city,ev,year,rand){
  if(ev.kind==='plague'){const lost=Math.round((city.residents||0)*ev.share);city.residents=Math.max(1,(city.residents||0)-lost);
    city.events.push({year,type:'epidemic',impact:lost,text:`${ev.text} (${lost.toLocaleString('en-US')} lives)`});}
  else if(ev.kind==='migrants'){const add=Math.round((city.residents||0)*ev.share);city.residents=(city.residents||0)+add;
    city.events.push({year,type:'migration',text:`${ev.text} (+${add.toLocaleString('en-US')})`});}
  else if(ev.kind==='war'){
    const keep=[],lost=[];for(const b of city.buildings){if(!b.protected&&!b.special&&b.type!=='center'&&rand()<ev.share)lost.push(b);else keep.push(b);}
    city.buildings=keep;for(const b of lost)city.sites.push({id:b.id,type:b.type,style:b.style,born:b.born,ended:year,x:b.x,y:b.y,reason:'war',protected:false});
    city.residents=Math.round((city.residents||0)*(1-ev.share*.8));
    city.events.push({year,type:'disaster',text:`${ev.text} (${lost.length} buildings lost)`});}
}
