// CIVITAS v2.5 — the five Ages. One table drives what changes when a new Age
// begins: the building style, the street pattern, which landmarks are built
// and which urban works are sold, the map's label, and the "Welcome to the
// … Age" moment. No imports, so every module can read it.
export const AGES=[
  {id:'medieval',name:'Medieval',title:'the Middle Ages',from:1300,to:1499,style:'timber',streets:'organic',
    tagline:'Winding lanes and timber houses around the parish church.',streetText:'Lanes wander from the market cross.',styleText:'Timber houses on narrow, deep plots.'},
  {id:'renaissance',name:'Renaissance',title:'the Renaissance',from:1500,to:1699,style:'stone',streets:'straight',
    tagline:'Stone houses, straight new streets and civic halls.',streetText:'New streets run straight; squares open up.',styleText:'Stone houses and town halls.'},
  {id:'enlightenment',name:'Enlightenment',title:'the Age of Enlightenment',from:1700,to:1849,style:'classical',streets:'grid',
    tagline:'Planned grids, classical terraces and public gardens.',streetText:'New quarters are laid out as grids.',styleText:'Classical terraces and garden squares.'},
  {id:'modern',name:'Modern',title:'the Modern Age',from:1850,to:1949,style:'brick',streets:'industrial',
    tagline:'Railways, factories, brick terraces and boulevards.',streetText:'Wide blocks, avenues and boulevards.',styleText:'Brick terraces and factory sheds.'},
  {id:'contemporary',name:'Contemporary',title:'the Contemporary Age',from:1950,to:2030,style:'modernist',streets:'modern',
    tagline:'Ring roads, estates, suburbs and parks.',streetText:'Big blocks, ring roads and curving suburbs.',styleText:'Slab estates, then detached houses in gardens.'}
];
export function ageAt(year){let a=AGES[0];for(const x of AGES)if(year>=x.from)a=x;return a;}
export const ageIndex=year=>AGES.indexOf(ageAt(year));
// Building style by year: the Age's style (the Contemporary Age turns from modernist to contemporary in 2000).
export function ageStyle(year){const a=ageAt(year);return a.id==='contemporary'&&year>=2000?'contemporary':a.style;}
// Street pattern used by growth.js: organic lanes, then straight streets, then the lattice (from the Enlightenment).
export function agePattern(year){return year<1500?'organic':year<1850?'regular':year<1950?'industrial':'modern';}
export const AGE_STARTS=AGES.slice(1).map(a=>a.from);
