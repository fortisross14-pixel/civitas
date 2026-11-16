// CIVITAS v3.6 — real densities. People a parcel (≈17 m square) holds by Age, so land and
// people agree with the map: about two medieval houses, a few storeys by 1700, tenements in
// the 1800s, towers later.
import {POP_SCALE} from './geo.js';
// v3.8: modern figures kept in reach of the map (1.7 × 1.2 km): districts fill instead of standing empty.
export const PEOPLE_PER_PARCEL=year=>year<1500?10:year<1700?18:year<1750?28:year<1850?40:year<1950?45:year<2000?90:120;
const OLD_CAPACITY=year=>(year<1750?8:year<1850?14:year<1950?27:year<2000?45:58)*POP_SCALE;
// How much smaller a building is than before v3.6: jobs, upgrades, building pace and parcel costs follow it.
export const densityRatio=year=>PEOPLE_PER_PARCEL(year)/OLD_CAPACITY(year);
