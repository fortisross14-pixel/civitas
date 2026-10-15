// CIVITAS v0.5: small era-bound catalogue of ordinary civic works.
// Exceptional structures enter a run ONLY through Turning Points or figures.
export const BASIC_BUILDINGS=[
 {id:'market',name:'Market Square',era:'Medieval',start:1300,end:1499,cost:130,kind:'market',domain:'trade',description:'Trade +10%; creates a compact market square.'},
 {id:'chapel',name:'Parish Chapel',era:'Medieval',start:1300,end:1499,cost:160,kind:'chapel',domain:'religion',description:'Faith +10%; an early local spiritual center.'},
 {id:'town_hall',name:'Town Hall',era:'Early modern',start:1500,end:1749,cost:290,kind:'town_hall',domain:'education',description:'Treasury revenue +12%; local civic administration.'},
 {id:'school',name:'Public School',era:'Early modern',start:1500,end:1749,cost:240,kind:'school',domain:'education',description:'Education +15%; a basic scholastic institution.'},
 {id:'garden',name:'Public Gardens',era:'Enlightenment',start:1750,end:1849,cost:400,kind:'garden',domain:'culture',description:'Culture and quality of life improve.'},
 {id:'clinic',name:'City Clinic',era:'Enlightenment',start:1750,end:1849,cost:420,kind:'clinic',domain:'education',description:'Public-service effectiveness +20%.'},
 {id:'station',name:'Rail Station',era:'Industrial',start:1850,end:1949,cost:820,kind:'station',domain:'trade',description:'Transport accessibility +25%.'},
 {id:'hospital',name:'Public Hospital',era:'Industrial',start:1850,end:1949,cost:950,kind:'hospital',domain:'education',description:'Public-service effectiveness +35%.'},
 {id:'library',name:'Civic Library',era:'Metropolitan',start:1950,end:1999,cost:1050,kind:'library',domain:'education',description:'Education +25%; preserves public knowledge.'},
 {id:'civic_center',name:'Civic Center',era:'Metropolitan',start:1950,end:1999,cost:1200,kind:'civic_center',domain:'education',description:'Service efficiency and administrative capacity.'},
 {id:'research_center',name:'Research Center',era:'Contemporary',start:2000,end:2030,cost:1750,kind:'research_center',domain:'education',description:'Education and innovation improve.'},
 {id:'transit_hub',name:'Transit Hub',era:'Contemporary',start:2000,end:2030,cost:1900,kind:'transit_hub',domain:'trade',description:'Transport and commerce improve.'}
];
export const BASIC_INDEX=Object.fromEntries(BASIC_BUILDINGS.map(b=>[b.id,b]));
export const SPECIAL_BUILDINGS={
 workshop:{name:'Artists’ Workshop',domain:'culture',description:'Artistic production and cultural prestige.'},
 university:{name:'Great University',domain:'education',description:'Advanced education, innovation, and productivity.'},
 port:{name:'Grand Port',domain:'trade',description:'International maritime commerce; must touch water.'},
 monastery:{name:'Monastery',domain:'religion',description:'Religious institutions and sacred scholarship.'},
 shrine:{name:'Sacred Monument',domain:'religion',description:'Religious prestige and pilgrimage.'},
 monument:{name:'Masterpiece Monument',domain:'culture',description:'Cultural prestige and future tourism.'},
 boulevard:{name:'Grand Boulevard',domain:'trade',description:'A monumental civic avenue (construction follows the street plan).'}
};
export const BUILDING_EFFECTS={
 market:{trade:.10},chapel:{faith:.10},town_hall:{treasury:.12},school:{education:.15},garden:{arts:.12,prosperity:2},
 clinic:{services:.20},station:{transport:.25},hospital:{services:.35},library:{education:.25},
 civic_center:{services:.25,treasury:.08},research_center:{education:.30,innovation:.18},transit_hub:{transport:.30,trade:.12},
 workshop:{arts:.10},university:{education:.25},port:{trade:.25},monastery:{faith:.20,faithEducation:.12},
 shrine:{faith:.30},monument:{arts:.08},boulevard:{transport:.12}
};
export function basicsForYear(year){return BASIC_BUILDINGS.filter(x=>year>=x.start&&year<=x.end);}
export function eraNameForYear(year){if(year<500)return 'Antiquity';if(year<1500)return 'Medieval';if(year<1750)return 'Early modern';if(year<1850)return 'Enlightenment';if(year<1950)return 'Industrial';if(year<2000)return 'Metropolitan';return 'Contemporary';}
export function figureEraEligible(fig,year){return year>=(fig.minYear??-Infinity)&&year<=(fig.maxYear??Infinity);}
export function projectLabel(project){return project.label||SPECIAL_BUILDINGS[project.kind]?.name||BASIC_INDEX[project.kind]?.name||project.kind;}
