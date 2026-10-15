// CIVITAS v0.4 Turning Points. Immutable card catalogue, deterministic offers,
// and pure run modifiers. All numerical values are provisional balance targets.
export const TURNING_POINTS=20;
export const CARD_TYPES=['instant','permanent','scaling','synergy','landmark','temporary'];
const card=(id,name,domain,rarity,kind,description,effects={},opts={})=>({id,name,domain,rarity,kind,description,effects,...opts});
export const CARDS=[
 // Population & urban growth (7)
 card('new_settlers','New Settlers','population','common','instant','Immediately attract 10% more residents.',{popInstant:.10},{repeatable:true}),
 card('fertile_families','Fertile Families','population','common','permanent','Natural population growth +20%.',{births:.20}),
 card('land_opportunity','Land of Opportunity','population','uncommon','permanent','Migration attraction +50%.',{migration:.50},{scorePulse:{attraction:36}}),
 card('dense_living','Dense Living','population','uncommon','permanent','Residential housing capacity +35%.',{housing:.35}),
 card('urban_expansion','Urban Expansion','population','common','permanent','New district development +40%.',{development:.40},{scorePulse:{infrastructure:30}}),
 card('housing_revolution','Housing Revolution','population','rare','permanent','New residential buildings house 50% more people.',{newHousing:.50}),
 card('metropolitan_magnet','Metropolitan Magnet','population','rare','scaling','Each major institution increases migration attraction by 5%.',{migrationPerLandmark:.05}),
 // industry (7)
 card('industrial_expansion','Industrial Expansion','industry','common','permanent','Workshop development +30%; manufacturing output +10%.',{industrialDevelopment:.30,industry:.10}),
 card('master_craftsmen','Master Craftsmen','industry','common','permanent','Manufacturing productivity +25%.',{industry:.25}),
 card('abundant_resources','Abundant Resources','industry','uncommon','permanent','Manufacturing output +30%.',{industry:.30}),
 card('industrial_revolution','Industrial Revolution','industry','epic','synergy','Industrial bonuses are amplified by 50%.',{industrialMultiplier:.50},{requiresAny:['industrial_expansion','master_craftsmen','abundant_resources','factory_town']}),
 card('factory_town','Factory Town','industry','rare','scaling','Each 1,000 manufacturing jobs increases sector output by 3%.',{industryPerThousand:.03}),
 card('trading_empire','Trading Empire','industry','uncommon','permanent','Trading infrastructure increases commerce output +40%.',{trade:.40}),
 card('economic_miracle','Economic Miracle','industry','rare','temporary','GDP +25% for the next three Turning Point intervals.',{gdp:.25},{durationPoints:3,repeatable:true,scorePulse:{economy:40}}),
 // arts, culture & tourism (8)
 card('hire_artists','Hire Artists','culture','common','landmark','Unlock an artists’ workshop project. Place it on the map to gain +30% artistic production.',{arts:.30},{building:'workshop'}),
 card('cultural_boom','Cultural Boom','culture','uncommon','synergy','Artists generate +50% Cultural Prestige.',{arts:.50},{requiresAny:['hire_artists','grand_workshops','patron_arts'],scorePulse:{culture:38}}),
 card('grand_workshops','Grand Workshops','culture','rare','scaling','Artist workshops create lasting masterpieces every few decades.',{masterpieces:1},{requiresAny:['hire_artists','patron_arts']}),
 card('patron_arts','Patron of the Arts','culture','common','permanent','Arts production +40%.',{arts:.40}),
 card('city_monuments','City of Monuments','culture','rare','scaling','Each monument grants +6% tourism appeal.',{tourismPerMonument:.06}),
 card('cultural_renaissance','Cultural Renaissance','culture','epic','synergy','Multiply all artistic institution bonuses by 2.',{artsMultiplier:1},{requiresAny:['hire_artists','patron_arts','grand_workshops']}),
 card('world_heritage','World Heritage','culture','uncommon','permanent','Historic buildings generate +50% more cultural appeal.',{heritage:.50}),
 card('tourist_paradise','Tourist Paradise','culture','rare','synergy','Turn historic prestige into modern tourism income.',{tourismIncome:.75},{minYear:1800,requiresAny:['hire_artists','patron_arts','world_heritage','city_monuments','grand_workshops']}),
 // religion (7)
 card('spiritual_awakening','Spiritual Awakening','religion','common','permanent','Religious influence +40%.',{faith:.40},{scorePulse:{faith:36}}),
 card('monastic_tradition','Monastic Tradition','religion','uncommon','landmark','Unlock a monastery project. Place it to improve faith and education.',{faith:.20,faithEducation:.25},{building:'monastery'}),
 card('great_pilgrimage','Great Pilgrimage','religion','rare','permanent','Pilgrimage attraction +50%.',{pilgrimage:.50},{requiresAny:['spiritual_awakening','monastic_tradition','sacred_architecture']}),
 card('sacred_architecture','Sacred Architecture','religion','uncommon','landmark','Unlock a sacred landmark project. Place it to improve religious prestige by 50%.',{faith:.50},{building:'shrine'}),
 card('holy_scholars','Holy Scholars','religion','rare','synergy','Religious institutions increase education power by 30%.',{faithEducation:.30},{requiresAny:['monastic_tradition','sacred_architecture']}),
 card('sacred_city','Sacred City','religion','epic','scaling','Faith institutions attract pilgrims and new residents.',{pilgrimage:.60,faithMigration:.20},{requiresAny:['great_pilgrimage','sacred_architecture','spiritual_awakening']}),
 card('religious_golden_age','Religious Golden Age','religion','rare','temporary','Double faith output for three Turning Point intervals.',{faithMultiplier:1},{durationPoints:3,repeatable:true}),
 // education & government (7)
 card('free_university','Free University','education','rare','landmark','Unlock a free university project; choose its location on the map.',{education:.25},{building:'university',minYear:1450}),
 card('great_scholars','Great Scholars','education','common','permanent','Education and research output +35%.',{education:.35},{scorePulse:{technology:34}}),
 card('enlightenment','Age of Enlightenment','education','rare','synergy','Universities improve GDP per capita by an additional 15%.',{universityProductivity:.15},{requiresAny:['free_university','knowledge_economy']}),
 card('scientific_revolution','Scientific Revolution','education','uncommon','permanent','Innovation production +50%.',{innovation:.50},{minYear:1550,scorePulse:{technology:43}}),
 card('knowledge_economy','Knowledge Economy','education','epic','scaling','Each university increases high-value productivity by 8%.',{knowledgePerUniversity:.08},{requiresAny:['free_university','great_scholars'],minYear:1650}),
 card('civic_reform','Civic Reform','education','common','permanent','Public services become 25% more effective.',{services:.25},{scorePulse:{infrastructure:30}}),
 card('admin_excellence','Administrative Excellence','education','uncommon','permanent','Municipal treasury revenue +30%.',{treasury:.30}),
 // trade, transport & planning (7)
 card('great_port','Great Port','trade','rare','landmark','Unlock a grand port project; place it beside water to improve commerce.',{trade:.25},{building:'port',geographies:['river','coast'],minYear:1400}),
 card('commercial_revolution','Commercial Revolution','trade','common','permanent','Commercial sector output +35%.',{trade:.35},{scorePulse:{economy:34}}),
 card('grand_boulevard','Grand Boulevard','trade','uncommon','landmark','Unlock a grand boulevard project. Place its starting point to construct the avenue.',{transport:.12},{building:'boulevard',minYear:1700}),
 card('transport_network','Transport Network','trade','common','permanent','Connectivity and development attraction +30%.',{transport:.30},{scorePulse:{infrastructure:34}}),
 card('merchant_republic','Merchant Republic','trade','rare','synergy','Strong commerce also attracts immigrants.',{merchantMigration:.30},{requiresAny:['commercial_revolution','great_port','trading_empire']}),
 card('urban_renewal','Urban Renewal','trade','uncommon','permanent','Urban redevelopment and reconstruction +40%.',{renewal:.40},{minYear:1750}),
 card('golden_age','Golden Age','trade','rare','temporary','GDP, prosperity and immigration improve for two intervals.',{gdp:.20,migration:.20,prosperity:6},{durationPoints:2,repeatable:true}),
 // wildcards (5)
 card('great_migration','Great Migration','wildcard','uncommon','instant','Immediately gain 20% residents, causing housing pressure.',{popInstant:.20},{repeatable:true}),
 card('ruthless_industry','Ruthless Industrialization','wildcard','rare','permanent','Industrial output +75% at the cost of heavy pollution.',{industry:.75,pollution:.35},{minYear:1750}),
 card('grand_patronage','Grand Patronage','wildcard','rare','permanent','Cultural and religious projects gain +70% power.',{arts:.35,faith:.35},{minYear:1400}),
 card('monumental_ambition','Monumental Ambition','wildcard','rare','landmark','Unlock two monument projects you must place; increases upkeep.',{treasury:-.10},{building:'double_monument'}),
 card('city_reinvention','City of Reinvention','wildcard','epic','permanent','Redevelopment +60%, but historic preservation suffers.',{renewal:.60,heritage:-.30},{minYear:1800})
];
export const CARD_INDEX=Object.fromEntries(CARDS.map(c=>[c.id,c]));
export const SYNERGIES=[
 {id:'renaissance',name:'The Renaissance',domain:'culture',needs:['hire_artists','grand_workshops','cultural_renaissance'],effects:{arts:.55,tourismIncome:.25},description:'Masterpieces and academies turn the city into a cultural center.'},
 {id:'industrial_giant',name:'Industrial Giant',domain:'industry',needs:['industrial_expansion','factory_town','transport_network'],effects:{industry:.40,industrialDevelopment:.35},description:'Connected factories produce at extraordinary scale.'},
 {id:'holy_city',name:'Holy City',domain:'religion',needs:['spiritual_awakening','sacred_architecture','great_pilgrimage'],effects:{faith:.75,pilgrimage:.45},description:'Sacred institutions attract pilgrimage from distant regions.'},
 {id:'vertical_metropolis',name:'Vertical Metropolis',domain:'population',needs:['dense_living','housing_revolution','land_opportunity'],effects:{housing:.20,migration:.25},description:'Intense migration supports a high-density metropolis.'},
 {id:'knowledge_capital',name:'Knowledge Capital',domain:'education',needs:['free_university','great_scholars','knowledge_economy'],effects:{education:.65,innovation:.50},description:'Universities and scholars create a knowledge powerhouse.'},
 {id:'merchant_empire',name:'Merchant Empire',domain:'trade',needs:['great_port','commercial_revolution','merchant_republic'],effects:{trade:.50,treasury:.25},description:'A thriving international mercantile center.'},
 {id:'heritage_jewel',name:'Heritage Jewel',domain:'culture',needs:['world_heritage','city_monuments','tourist_paradise'],effects:{tourismIncome:.60,heritage:.35},description:'Protected heritage becomes the city’s greatest resource.'},
 {id:'pilgrim_scholars',name:'Sacred Scholarship',domain:'religion',needs:['monastic_tradition','holy_scholars','great_scholars'],effects:{education:.40,faith:.25},description:'Faith and scholarship reinforce each other.'},
 {id:'industrial_renaissance',name:'Industrial Renaissance',domain:'industry',needs:['master_craftsmen','hire_artists','industrial_revolution'],effects:{industry:.25,arts:.30},description:'Industrial craftsmanship and design flourish together.'},
 {id:'modernization',name:'Great Modernization',domain:'trade',needs:['urban_renewal','transport_network','civic_reform'],effects:{renewal:.35,services:.30},description:'Reconstruction and infrastructure create a highly efficient city.'}
];
export const DOMAINS={population:{name:'Population',color:'#79966f',symbol:'◉'},industry:{name:'Industry',color:'#a5785c',symbol:'▥'},culture:{name:'Culture',color:'#9f78a5',symbol:'✦'},religion:{name:'Religion',color:'#ae955b',symbol:'✣'},education:{name:'Education',color:'#658da2',symbol:'◆'},trade:{name:'Commerce',color:'#b0925a',symbol:'▣'},wildcard:{name:'Wildcard',color:'#8c8396',symbol:'✧'}};
export const RARITY_COLORS={common:'#8f948c',uncommon:'#61976f',rare:'#5e8db7',epic:'#9c72bf',legend:'#c3a04d'};

const hash=(...a)=>{let h=2166136261;for(const v of a){for(const ch of String(v)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}}return h>>>0;};
const rng=(n)=>()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
const clamp=(n,low,high)=>Math.min(high,Math.max(low,n));
export const turningYears=(start=1300,end=2030)=>Array.from({length:TURNING_POINTS},(_,i)=>start+Math.round((i+1)*(end-start)/(TURNING_POINTS+1)/5)*5);
export function currentTurningIndex(city){return Math.max(0,Math.min(TURNING_POINTS,city?.turning?.choices?.length||0));}
export function resolvedCards(city){return (city?.turning?.choices||[]).map(p=>CARD_INDEX[p.cardId]).filter(Boolean);}
export function activeSynergies(city){
 const choices=city.turning?.choices||[];
 const owned=new Set(choices.filter((pick,i)=>{
  const card=CARD_INDEX[pick.cardId];
  return card&&(!card.building||(city.landmarks||[]).some(l=>l.source===`choice:${i}`));
 }).map(p=>p.cardId));
 return SYNERGIES.filter(s=>s.needs.every(id=>owned.has(id)));
}
export function modifiers(city){
 const result={...(city.legacyBonuses||{})};const picks=city.turning?.choices||[],count=picks.length;
 for(let i=0;i<picks.length;i++){
  const c=CARD_INDEX[picks[i].cardId];if(!c||c.kind==='instant')continue;
  // Duration is measured in *all* Turning Point choices, including people;
  // filtering figures out first would cause temporaries to expire too early.
  const expires=c.durationPoints&&i+c.durationPoints<count;
  if(expires)continue;
  // Exceptional building cards grant a site-specific project, not a free
  // abstract bonus. Effects activate only after the player places a project.
  if(c.building && !(city.landmarks||[]).some(l=>l.source===`choice:${i}`))continue;
  for(const [k,v] of Object.entries(c.effects)){if(k==='popInstant'||k==='masterpieces')continue;result[k]=(result[k]||0)+v;}
 }
 for(const f of (city.figures||[]))for(const [k,v] of Object.entries(f.effects||{}))result[k]=(result[k]||0)+v;
 for(const synergy of activeSynergies(city))for(const [k,v] of Object.entries(synergy.effects))result[k]=(result[k]||0)+v;
 // Temporary cards accumulate once selected and expire after N more selections.
 return result;
}
export function canDraw(card,city){
 if(!card||city.year<(card.minYear??-Infinity)||city.year>(card.maxYear??Infinity))return false;
 if(card.kind==='figure'){if(!card.generic&&!city.turning?.figurePool?.includes(card.figureId))return false; if(!card.generic&&(city.figures||[]).some(f=>f.id===card.figureId))return false; if(card.generic&&(city.turning?.choices||[]).filter(p=>p.cardId===card.id).length>=2)return false;}
 else if(Array.isArray(city.turning?.cardPool)&&!city.turning.cardPool.includes(card.id))return false;
 if(card.geographies&&!card.geographies.includes(city.type))return false;
 if(card.kind==='figure'&&(card.cost||0)>(city.funds||0))return false;
 if(card.effects?.popInstant){const housing=120+(city.buildings||[]).filter(b=>b.type==='res').reduce((n,b)=>n+(b.capacity||8),0);if((city.residents||120)>=housing*1.60)return false;}
 const owned=new Set(resolvedCards(city).map(c=>c.id));
 if(!card.repeatable&&owned.has(card.id))return false;
 if(card.repeatable&&(city.turning?.choices||[]).filter(p=>p.cardId===card.id).length>=2)return false;
 if(card.requiresAny&&!card.requiresAny.some(id=>owned.has(id)))return false;
 return true;
}
const baseWeight={common:12,uncommon:8,rare:4,epic:2,legend:.45};
function drawFrom(pool,roll,selected,weightFn){let items=pool.filter(c=>!selected.has(c.id));if(!items.length)return null;let total=items.reduce((n,c)=>n+Math.max(.01,weightFn(c)),0),target=roll()*total;
 for(const c of items){target-=Math.max(.01,weightFn(c));if(target<=0)return c;}return items.at(-1);
}
export function generateOffers(city,index,reroll=0,extra=[]){
 const owned=resolvedCards(city),dominance={};for(const c of owned)dominance[c.domain]=(dominance[c.domain]||0)+1;
 const leading=Object.keys(dominance).sort((a,b)=>dominance[b]-dominance[a]||a.localeCompare(b))[0];
 const roll=rng(hash(city.seed,index,reroll,owned.map(c=>c.id).join('|'),(city.figures||[]).map(f=>f.id).join('|')));
 const available=[...CARDS,...extra].filter(c=>canDraw(c,city));
 const selected=new Set(),slots=[];
 // Slot 1: purposeful combo offer when possible; early game still genuinely random.
 const synergyCandidates=available.filter(c=>(c.requiresAny&&c.requiresAny.length)||(leading&&leading!=='wildcard'&&c.domain===leading));
 const approaches=[synergyCandidates.length>=2&&roll()<.66?synergyCandidates:available,available,available];
 for(let slot=0;slot<3;slot++){
  const candidates=approaches[slot].filter(c=>!selected.has(c.id));
  const pool=candidates.length?candidates:available.filter(c=>!selected.has(c.id));
  const item=drawFrom(pool,roll,selected,c=>{
   let weight=baseWeight[c.rarity]||1;
   if(c.kind==='figure')weight*=c.generic?.28:city.turning?.featuredFigures?.includes(c.figureId)?3.5:.8;
   if((city.legacyBonuses?.rareLuck||0)>0&&['rare','epic','legend'].includes(c.rarity))weight*=(1+city.legacyBonuses.rareLuck);
   if(slot===0){if(c.requiresAny)weight*=2.3;if(leading&&leading!=='wildcard'&&c.domain===leading)weight*=1.8;}
   if(slot===1&&['population','education','trade'].includes(c.domain))weight*=1.4;
   if(slot===2&&leading&&c.domain!==leading)weight*=1.4;
   // Basic geographical relevance, not a guaranteed build or a prescribed victory.
   if(c.domain==='trade'&&city.type==='coast')weight*=1.15;
   return weight;
  });
  if(item){selected.add(item.id);slots.push(item.id);}
 }
 // Featured figures are meaningful loadout choices, not merely a tiny rarity bonus.
 // Only figures currently alive in the relevant historical window and affordable
 // to the city can be inserted. They remain optional, not guaranteed hires.
 const featured=available.filter(c=>c.kind==='figure'&&!c.generic&&city.turning?.featuredFigures?.includes(c.figureId));
 if(featured.length&&roll()<.48){
  const candidate=drawFrom(featured,roll,new Set(),c=>({rare:3,epic:2,legend:1}[c.rarity]||1));
  if(candidate&&!slots.includes(candidate.id)&&slots.length>=3)slots[2]=candidate.id;
 }
 return slots;
}

export function pendingFor(city){const t=city.turning;return t?.pending||null;}
export function pendingYear(city){return turningYears()[currentTurningIndex(city)];}
